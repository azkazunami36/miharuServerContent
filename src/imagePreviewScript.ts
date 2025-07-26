//@ts-check

addEventListener("load", () => {
    /** @type {HTMLElement | null | undefined} */
    const content = document.getElementById("content");
    if (!content) return;
    const images = (() => {
        const images = [];
        for (const image of content.getElementsByTagName("img")) if (!image.classList.contains("ignorePreview")) images.push(image);
        return images;        
    })();
    let viewed = false;
    class ViewElement {
        /** @type {HTMLElement | undefined} */
        viewElement;
        nowViewed = 0;
        viewed = false;
        /** @type {() => void} */
        resize;
        /** @type {() => void} */
        close;
        /** @type {() => void} */
        refleshView;
        /** @type {() => void} */
        refleshViewedStatus;
        constructor() {
            this.viewElement = document.createElement("span");
            this.viewElement.style.display = "none";
            this.viewElement.id = "imagePreview";
            const img = document.createElement("img");
            const operatingPanel = document.createElement("div");
            operatingPanel.id = "operatingPanel";

            const headerButton = document.createElement("div");
            headerButton.id = "headerButton";

            const closeIcon = document.createElement("span");
            closeIcon.id = "closeIcon";
            closeIcon.classList.add("material-icons");
            closeIcon.innerText = "close";
            this.refleshViewedStatus = () => {
                if (!this.viewElement) return;
                if (this.viewed) {
                    this.viewElement.style.display = "flex";
                    this.viewElement.classList.add("viewed");
                    this.viewElement.setAttribute("data-viewed", "true");
                } else {
                    this.viewElement.classList.remove("viewed");
                    setTimeout(() => {
                        if (!this.viewElement) return;
                        this.viewElement.style.display = "none";
                    }, 250);
                    this.viewElement.setAttribute("data-viewed", "false");
                };
            }
            this.resize = async () => {
                // 読み込みが完了していなかったら読み込みを待つ
                if (img.naturalWidth === 0) {
                    await new Promise(resolve => img.onload = resolve);
                }

                img.style.maxWidth = img.naturalWidth / window.devicePixelRatio + "px";
                img.style.maxHeight = img.naturalHeight / window.devicePixelRatio + "px";
            }
            addEventListener("resize", this.resize);
            this.close = () => {
                this.viewed = false;
                this.refleshViewedStatus();
            }
            closeIcon.addEventListener("click", this.close);
            headerButton.appendChild(closeIcon);

            const centerButton = document.createElement("div");
            centerButton.id = "centerButton";

            const leftIcon = document.createElement("span");
            leftIcon.id = "leftIcon";
            leftIcon.classList.add("material-icons");
            leftIcon.innerText = "arrow_back_ios";
            centerButton.appendChild(leftIcon);
            const rightIcon = document.createElement("span");
            rightIcon.id = "rightIcon";
            rightIcon.classList.add("material-icons");
            rightIcon.innerText = "arrow_forward_ios";
            centerButton.appendChild(rightIcon);

            const bottomButton = document.createElement("div");
            bottomButton.id = "bottomButton";

            const status = document.createElement("span");
            status.id = "status";
            bottomButton.appendChild(status);
            this.refleshView = () => {
                if (this.nowViewed === 0) leftIcon.style.opacity = "0.5"; else leftIcon.style.opacity = "1";
                if (this.nowViewed === images.length - 1) rightIcon.style.opacity = "0.5"; else rightIcon.style.opacity = "1";
                img.src = images[this.nowViewed].dataset.original || images[this.nowViewed].src;

                this.resize();
                status.innerText = "ページ(" + (this.nowViewed + 1) + "/" + (images.length) + ")" + (images[this.nowViewed].alt ? " - " + images[this.nowViewed].alt : "");
            }
            leftIcon.addEventListener("click", () => {
                if (this.nowViewed === 0) return;
                this.nowViewed--;
                this.refleshView();
            });
            rightIcon.addEventListener("click", () => {
                if (this.nowViewed === images.length - 1) return;
                this.nowViewed++;
                this.refleshView();
            });

            operatingPanel.appendChild(headerButton);
            operatingPanel.appendChild(centerButton);
            operatingPanel.appendChild(bottomButton);
            this.viewElement.appendChild(img);
            this.viewElement.appendChild(operatingPanel);
            document.body.appendChild(this.viewElement);
            addEventListener("click", e => {
                /** @type {HTMLElement | null} */
                const target = /** @type {() => any} */(() => { return e.target })();
                if (target === null) return;
                if ((target as HTMLElement).tagName === "IMG" && (target as HTMLElement).parentElement?.parentElement?.id === "content") {
                    if (viewed === false) {
                        this.nowViewed = (() => { for (let i = 0; i < images.length; i++) if (images[i] === e.target) return i; return 0; })();
                        this.viewed = true;
                        this.refleshView();
                        this.refleshViewedStatus();
                    }
                }
            });
            addEventListener("keydown", e => {
                if (this.viewed === false) return;
                if (e.key === "ArrowLeft") {
                    if (this.nowViewed === 0) return;
                    this.nowViewed--;
                    this.refleshView();
                } else if (e.key === "ArrowRight") {
                    if (this.nowViewed === images.length - 1) return;
                    this.nowViewed++;
                    this.refleshView();
                } else if (e.key === "Escape") {
                    this.close();
                }
            });
        }
    }
    new ViewElement();
}); 
