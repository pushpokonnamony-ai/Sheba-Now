(function () {
    const styles = `
        .custom-notification-container {
            position: fixed;
            right: max(16px, env(safe-area-inset-right));
            bottom: max(16px, env(safe-area-inset-bottom));
            z-index: 20000;
            display: grid;
            gap: 10px;
            width: min(420px, calc(100vw - 32px));
            pointer-events: none;
        }
        .custom-notification {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 14px 14px 14px 16px;
            border: 1px solid #d6e9df;
            border-left: 4px solid #07845f;
            border-radius: 14px;
            background: #fff;
            color: #18352e;
            box-shadow: 0 12px 32px rgba(7, 61, 45, .2);
            font: 600 14px/1.6 "Noto Sans Bengali", "Segoe UI", Tahoma, sans-serif;
            opacity: 0;
            transform: translateY(12px);
            transition: opacity .2s ease, transform .2s ease;
            pointer-events: auto;
        }
        .custom-notification.is-visible { opacity: 1; transform: translateY(0); }
        .custom-notification-message { min-width: 0; flex: 1; overflow-wrap: anywhere; }
        .custom-notification-dismiss {
            flex: 0 0 auto;
            min-width: 54px;
            padding: 7px 12px;
            border: 0;
            border-radius: 9px;
            background: #087f5b;
            color: #fff;
            font: 700 13px/1.4 Arial, "Noto Sans Bengali", sans-serif;
            cursor: pointer;
        }
        .custom-notification-dismiss:hover { background: #06674a; }
        .custom-notification-dismiss:focus-visible { outline: 3px solid #8bd6b5; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
            .custom-notification { transition: none; }
        }
    `;

    const styleElement = document.createElement("style");
    styleElement.textContent = styles;
    document.head.append(styleElement);

    let container;

    window.showNotification = function (message) {
        if (!container || !container.isConnected) {
            container = document.createElement("div");
            container.className = "custom-notification-container";
            container.setAttribute("aria-label", "Notifications");
            document.body.append(container);
        }

        const notification = document.createElement("div");
        notification.className = "custom-notification";
        notification.setAttribute("role", "status");
        notification.setAttribute("aria-live", "polite");

        const messageElement = document.createElement("span");
        messageElement.className = "custom-notification-message";
        messageElement.textContent = String(message ?? "");

        const dismissButton = document.createElement("button");
        dismissButton.className = "custom-notification-dismiss";
        dismissButton.type = "button";
        dismissButton.textContent = "OK";

        let dismissed = false;
        const dismiss = function () {
            if (dismissed) return;
            dismissed = true;
            window.clearTimeout(timeoutId);
            notification.classList.remove("is-visible");
            window.setTimeout(() => notification.remove(), 220);
        };
        dismissButton.addEventListener("click", dismiss);
        notification.append(messageElement, dismissButton);
        container.append(notification);

        window.requestAnimationFrame(() => notification.classList.add("is-visible"));
        const timeoutId = window.setTimeout(dismiss, 7000);
    };
}());
