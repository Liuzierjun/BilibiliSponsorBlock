import * as React from "react";

export interface DynamicServerAddressProps {}

export interface DynamicServerAddressState {
    isRefreshing: boolean;
}

class DynamicServerAddressComponent extends React.Component<
    DynamicServerAddressProps,
    DynamicServerAddressState
> {
    constructor(props: DynamicServerAddressProps) {
        super(props);

        this.state = {
            isRefreshing: false,
        };
    }

    async handleRefresh(): Promise<void> {
        this.setState({ isRefreshing: true });

        try {
            const response = await new Promise<{ ok: boolean }>((resolve) => {
                chrome.runtime.sendMessage({ message: "forceRefreshServerAddress" }, resolve);
            });

            if (response.ok) {
                alert(
                    chrome.i18n.getMessage("refreshServerAddressSuccess") || "Server address refreshed successfully!"
                );
            } else {
                alert(chrome.i18n.getMessage("refreshServerAddressFailed") || "Failed to refresh server address!");
            }
        } catch (error) {
            alert(chrome.i18n.getMessage("refreshServerAddressFailed") || "Failed to refresh server address!");
        } finally {
            this.setState({ isRefreshing: false });
        }
    }

    render(): React.ReactElement {
        return (
            <div>
                <div
                    className={`option-button inline ${this.state.isRefreshing ? "disabled" : ""}`}
                    onClick={() => !this.state.isRefreshing && this.handleRefresh()}
                >
                    {this.state.isRefreshing
                        ? chrome.i18n.getMessage("refreshing") || "Refreshing..."
                        : chrome.i18n.getMessage("refreshDynamicServerAddress") || "Refresh Server Address"}
                </div>
            </div>
        );
    }
}

export default DynamicServerAddressComponent;

