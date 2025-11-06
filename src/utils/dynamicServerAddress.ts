import * as CompileConfig from "../../config.json";
import Config from "../config";

/**
 * 动态服务器地址管理器
 * 负责从远程接口获取服务器地址，并实现缓存机制
 */

interface ServerAddressResponse {
    address: string;
    // 可以扩展其他字段，比如负载均衡配置等
}

/**
 * 从远程接口获取服务器地址
 */
async function fetchServerAddressFromAPI(): Promise<string | null> {
    try {
        const url = Config.config.dynamicServerAddressUrl;

        // 设置超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-EXT-VERSION": chrome.runtime.getManifest().version,
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn(`[BSB] Failed to fetch dynamic server address: HTTP ${response.status}`);
            return null;
        }

        const data: ServerAddressResponse = await response.json();

        if (!data.address || typeof data.address !== "string") {
            console.warn("[BSB] Invalid server address format received:", data);
            return null;
        }

        console.log("[BSB] Successfully fetched dynamic server address:", data.address);
        return data.address;
    } catch (error) {
        if (error.name === "AbortError") {
            console.warn("[BSB] Fetch server address timeout");
        } else {
            console.error("[BSB] Error fetching dynamic server address:", error);
        }
        return null;
    }
}

/**
 * 检查缓存是否过期
 */
function isCacheExpired(): boolean {
    const cache = Config.local.dynamicServerAddressCache;

    if (!cache || !cache.fetchedAt) {
        return true;
    }

    const ttl = Config.config.dynamicServerAddressTTL;
    const now = Date.now();
    const age = now - cache.fetchedAt;

    return age > ttl;
}

/**
 * 更新服务器地址缓存
 */
export async function updateServerAddressCache(): Promise<void> {
    // 如果未启用动态服务器地址，直接返回
    if (!Config.config.useDynamicServerAddress) {
        return;
    }

    // 如果缓存未过期，不需要更新
    if (!isCacheExpired()) {
        console.log("[BSB] Dynamic server address cache is still valid");
        return;
    }

    console.log("[BSB] Updating dynamic server address cache...");

    // 尝试从API获取新地址
    const newAddress = await fetchServerAddressFromAPI();

    if (newAddress) {
        // 更新缓存
        Config.local.dynamicServerAddressCache = {
            address: newAddress,
            fetchedAt: Date.now(),
        };

        // 同步更新配置中的服务器地址字段
        Config.config.serverAddress = newAddress;

        console.log("[BSB] Dynamic server address cache updated successfully");
    } else {
        console.warn("[BSB] Failed to update dynamic server address, will use fallback");
    }
}

/**
 * 获取当前的服务器地址
 * 按照优先级返回：
 * 1. 测试服务器（如果启用）
 * 2. 动态服务器地址（如果启用且有效）
 * 3. 默认服务器地址
 */
export function getServerAddress(): string {
    // 1. 测试服务器优先级最高
    if (Config.config.testingServer) {
        return CompileConfig.testingServerAddress;
    }

    // 2. 尝试使用动态服务器地址
    if (Config.config.useDynamicServerAddress) {
        const cache = Config.local.dynamicServerAddressCache;

        // 检查缓存是否存在且有效
        if (cache && cache.address && !isCacheExpired()) {
            return cache.address;
        }

        // 缓存过期但仍有地址，仍然使用（后台会异步更新）
        if (cache && cache.address) {
            console.log("[BSB] Using expired dynamic server address, will update in background");
            // 触发后台更新（不等待）
            void updateServerAddressCache();
            return cache.address;
        }
    }

    // 3. 降级到默认服务器地址
    return Config.config.serverAddress;
}

/**
 * 强制刷新服务器地址
 * 可用于手动触发更新或故障恢复
 */
export async function forceRefreshServerAddress(): Promise<boolean> {
    if (!Config.config.useDynamicServerAddress) {
        console.warn("[BSB] Dynamic server address is disabled");
        return false;
    }

    console.log("[BSB] Force refreshing server address...");
    const newAddress = await fetchServerAddressFromAPI();

    if (newAddress) {
        Config.local.dynamicServerAddressCache = {
            address: newAddress,
            fetchedAt: Date.now(),
        };

        // 同步更新配置中的服务器地址字段
        Config.config.serverAddress = newAddress;

        console.log("[BSB] Server address refreshed successfully:", newAddress);
        return true;
    }

    console.warn("[BSB] Failed to refresh server address");
    return false;
}

/**
 * 清除服务器地址缓存
 * 用于重置或排查问题
 */
export function clearServerAddressCache(): void {
    Config.local.dynamicServerAddressCache = undefined;
    console.log("[BSB] Server address cache cleared");
}

