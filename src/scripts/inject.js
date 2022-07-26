const is_cws = /chrome.google.com\/webstore/i;
const is_ows = /addons.opera.com\/.*extensions/i;
const is_ews = /microsoftedge\.microsoft\.com\/addons\//i;
const cws_re = /.*detail\/[^\/]*\/([a-z]{32})/i;
const ows_re = /.*details\/([^\/?#]+)/i;
const ews_re = /.*addons\/.+?\/([a-z]{32})/i;

var dlBtn;

function getExtensionId(url) {
    return (cws_re.exec(url) || ows_re.exec(url) || ews_re.exec(url))[1];
}

function buildExtensionUrl(extensionId) {
    if (is_cws.test(window.location.href)) {
        var chromeVersion = /Chrome\/([0-9.]+)/.exec(navigator.userAgent)[1];
        return (
            "https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&prodversion=" +
            chromeVersion +
            "&x=id%3D" +
            extensionId +
            "%26installsource%3Dondemand%26uc"
        );
    }
    if (is_ows.test(window.location.href)) {
        return (
            "https://addons.opera.com/extensions/download/" + extensionId + "/"
        );
    }
    if (is_ews.test(window.location.href)) {
        return (
            "https://edge.microsoft.com/extensionwebstorebase/v1/crx?response=redirect&x=id%3D" +
            extensionId +
            "%26installsource%3Dondemand%26uc"
        );
    }
}

function createButton(newParent, addBtn = true) {
    const button_div = document.createElement("div");
    button_div.setAttribute("role", "button");
    button_div.setAttribute(
        "class",
        "dd-Va g-c-wb g-eg-ua-Uc-c-za g-c-Oc-td-jb-oa g-c"
    );

    button_div.setAttribute("tabindex", "0");
    button_div.setAttribute("style", "user-select: none;");
    var hf = document.createElement("div");
    hf.setAttribute("class", "g-c-Hf");
    button_div.appendChild(hf);
    var x = document.createElement("div");
    x.setAttribute("class", "g-c-x");
    hf.appendChild(x);
    const r = document.createElement("div");
    r.setAttribute("class", "g-c-R  webstore-test-button-label");
    x.appendChild(r);
    button_div.toggleState = function (isInstall) {
        isInstall
            ? button_div.setAttribute("isInstallBtn", "")
            : button_div.removeAttribute("isInstallBtn");
        button_div.setAttribute(
            "aria-label",
            isInstall
                ? chrome.i18n.getMessage("webstore_addButton")
                : chrome.i18n.getMessage("webstore_removeButton")
        );
        r.innerHTML = isInstall
            ? chrome.i18n.getMessage("webstore_addButton")
            : chrome.i18n.getMessage("webstore_removeButton");
    };
    if (addBtn) button_div.setAttribute("isInstallBtn", "");
    button_div.toggleState(addBtn);
    let dlurl = buildExtensionUrl(getExtensionId(window.location.href));
    button_div.id = getExtensionId(window.location.href);
    button_div.addEventListener("click", function () {
        if (button_div.hasAttribute("isInstallBtn")) {
            chrome.runtime.sendMessage({
                installExt: getExtensionId(window.location.href),
            });
            promptInstall(dlurl, true);
        } else {
            chrome.runtime.sendMessage(
                {
                    uninstallExt: getExtensionId(window.location.href),
                },
                (resp) => {
                    if (resp.uninstalled) {
                        button_div.toggleState(true);
                    }
                }
            );
        }
    });
    button_div.addEventListener("mouseover", function () {
        this.classList.add("g-c-l");
    });
    button_div.addEventListener("mouseout", function () {
        this.classList.remove("g-c-l");
    });
    newParent.innerHTML = "";
    newParent.appendChild(button_div);
    dlBtn = button_div;
}
var modifyButtonObserver = new MutationObserver(function (mutations, observer) {
    mutations.forEach(function (mutation) {
        if (
            mutation.addedNodes.length &&
            !mutation.removedNodes.length &&
            mutation.nextSibling == null &&
            mutation.addedNodes[0].className == "f-rd"
        ) {
            var container_div = document.querySelector(".h-e-f-Ra-c");
            if (container_div && null == container_div.firstChild) {
                chrome.runtime.sendMessage(
                    {
                        checkExtInstalledId: getExtensionId(
                            window.location.href
                        ),
                    },
                    (resp) => {
                        createButton(container_div, !resp.installed);
                    }
                );
            }
        }
    });
});
attachMainObserver = new MutationObserver(function (mutations, observer) {
    mutations.forEach(function (mutation) {
        modifyButtonObserver.observe(mutation.target.querySelector(".F-ia-k"), {
            subtree: true,
            childList: true,
        });
    });
    observer.disconnect();
});
if (is_ews.test(window.location.href)) {
    new MutationObserver(function (mutations, observer) {
        mutations.forEach(function (mutation) {
            mutation.target
                .querySelectorAll('button[id^="getOrRemoveButton-"][disabled]')
                .forEach((btn) => {
                    btn.classList.remove(
                        btn.className
                            .split(" ")
                            .sort(
                                (a, b) =>
                                    parseInt(b.slice(1)) - parseInt(a.slice(1))
                            )[btn.name == "GetButton" ? 1 : 0]
                    );
                    btn.removeAttribute("disabled");
                    btn.addEventListener("click", () => {
                        promptInstall(
                            buildExtensionUrl(btn.id.split("-")[1]),
                            true,
                            WEBSTORE.edge
                        );
                    });
                    dlBtn = btn;
                });
        });
    }).observe(document.body, {
        childList: true,
        subtree: true,
    });
}
if (is_cws.test(window.location.href)) {
    attachMainObserver.observe(document.body, {
        childList: true,
    });
}
if (is_ows.test(window.location.href)) {
    let installDiv = document.body.querySelector(".sidebar .get-opera");
    let sidebar = installDiv.parentElement;
    let wrapper = document.createElement("div");
    wrapper.classList.add("wrapper-install");
    dlBtn = document.createElement("a");
    dlBtn.classList.add("btn-install");
    dlBtn.classList.add("btn-with-plus");
    dlBtn.innerHTML = chrome.i18n.getMessage("webstore_addButton");
    sidebar.replaceChild(wrapper, installDiv);
    wrapper.appendChild(dlBtn);
    dlBtn.addEventListener("click", () =>
        promptInstall(
            buildExtensionUrl(getExtensionId(window.location.href)),
            true,
            WEBSTORE.opera
        )
    );
}
window.onload = () => {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
            case "install":
                console.log(
                    "opening extension URL:",
                    buildExtensionUrl(getExtensionId(window.location.href))
                );
                if (dlBtn) dlBtn.click();
                break;
            case "extInstalled":
                if (request.extId == getExtensionId(window.location.href))
                    document.getElementById(request.extId).toggleState(false);
                break;
        }
    });
};
