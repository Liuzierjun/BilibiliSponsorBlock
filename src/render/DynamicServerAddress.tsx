import * as React from "react";
import { createRoot } from "react-dom/client";
import DynamicServerAddressComponent from "../components/options/DynamicServerAddressComponent";

class DynamicServerAddress {
    ref: React.RefObject<DynamicServerAddressComponent>;

    constructor(element: Element) {
        this.ref = React.createRef();

        const root = createRoot(element);
        root.render(<DynamicServerAddressComponent ref={this.ref} />);
    }

    update(): void {
        this.ref.current?.forceUpdate();
    }
}

export default DynamicServerAddress;

