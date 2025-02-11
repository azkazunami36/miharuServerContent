import fs from "fs";
import { marked } from "marked";
import { JSDOM } from "jsdom";
import { URL } from "url";
import hljs from "highlight.js";

const cacheData: {
    miharuBlogRepositoryFolderPath: string;
} = (() => {
    if (fs.existsSync("./cache.json")) {
        const json = JSON.parse(fs.readFileSync("./cache.json", "utf-8"));
        if (json.miharuBlogRepositoryFolderPath && json.miharuBlogRepositoryFolderPath[json.miharuBlogRepositoryFolderPath.length - 1] === "/" && fs.existsSync(json.miharuBlogRepositoryFolderPath)) {
            return json;
        } else {
            throw new Error("cache.json is invalid.");
        }
    } else {
        throw new Error("No cache.json found.");
    }
})();

// miharu-blog内の消してはならないファイルまたはフォルダ
const miharuBlogImportantFiles = [
    "CNAME",
    "LICENSE",
    ".git",
    "manifest.json",
    "ads.txt",
];

// cacheData.miharuBlogRepositoryFolderPathから必要なファイル以外すべてを削除する。削除するものがフォルダである場合を考慮する。
function deleteUnnecessaryFiles() {
    const files = fs.readdirSync(cacheData.miharuBlogRepositoryFolderPath);
    for (const file of files) {
        if (!miharuBlogImportantFiles.includes(file)) {
            const path = cacheData.miharuBlogRepositoryFolderPath + "/" + file;
            if (fs.statSync(path).isDirectory()) {
                fs.rmSync(path, { recursive: true });
            } else {
                fs.unlinkSync(path);
            }
        }
    }
}
deleteUnnecessaryFiles();

const ogPrefix = `og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# website: http://ogp.me/ns/website#`;

function getHeaderShare() { return fs.readFileSync("./templateHTML/headerShare.html", "utf-8"); };

function getBlogInfoJSON() {
    return JSON.parse(fs.readFileSync("./blogInfo.json", "utf-8")) as {
        type: "normal";
        title: string;
        timestamp: string; // YYYY/MM/DD
        editTimestamp?: string; // YYYY/MM/DD
        genre: string;
        keyword: string[];
        created: boolean;
        incomplete: boolean;
        topImageName?: string;
        htmlBlogSourceIs?: boolean;
    }[];
}

function getGenreExplanationJSON() {
    return JSON.parse(fs.readFileSync("./genreExplanation.json", "utf-8")) as {
        [genre: string]: {
            alt: string;
            reading: string[];
        };
    };
}

// ogp(twitter埋め込みなど)に関するheadタグのprefixを作成する関数
function createOGPrefix(info: {
    title?: string;
    description?: string;
    image?: string;
    alt?: string;
    url?: string;
    siteName?: string;
    twitterCard?: "summary" | "summary_large_image" | "app" | "player";
    twitterSite?: string;
    twitterCreator?: string;
}) {
    const domain = info.url ? new URL(info.url).hostname : undefined;
    return `\
    ${info.description ? `<meta name="description" content="${info.description}">` : ""}
    ${info.title ? `<meta property="og:title" content="${info.title}">` : ""}
    ${info.description ? `<meta property="og:description" content="${info.description}">` : ""}
    <meta property="og:type" content="website">
    ${info.url ? `<meta property="og:url" content="${info.url}">` : ""}
    ${info.image ? `<meta property="og:image" content="${info.image}">` : ""}
    ${info.siteName ? `<meta property="og:site_name" content="${info.siteName}">` : ""}
    <meta property="og:locale" content="ja_JP">
    ${info.twitterCard ? `<meta name="twitter:card" content="${info.twitterCard}">` : ""}
    ${info.twitterSite ? `<meta name="twitter:site" content="${info.twitterSite}">` : ""}
    ${info.twitterCreator ? `<meta name="twitter:creator" content="${info.twitterCreator}">` : ""}
    ${info.image ? `<meta name="twitter:image" content="${info.image}">` : ""}
    ${info.title ? `<meta name="twitter:title" content="${info.title}">` : ""}
    ${info.description ? `<meta name="twitter:description" content="${info.description}">` : ""}
    ${info.url ? `<meta name="twitter:url" content="${info.url}">` : ""}
    ${domain ? `<meta name="twitter:domain" content="${domain}">` : ""}`;
}

function writeFileSyncCRLF(path: string, data: string) {
    // ファイルを書き込む前に、フォルダが存在するかを確認する。存在しない場合はその名前のフォルダを作成(入れ子フォルダである場合も考慮)。パスがファイル名だけである場合はスキップ。
    const pathArray = path.split("/");
    pathArray.pop();
    const dirPath = cacheData.miharuBlogRepositoryFolderPath + pathArray.join("/");
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    const Path = cacheData.miharuBlogRepositoryFolderPath + path;

    if (fs.existsSync(Path)) {
        if (fs.readFileSync(Path, "utf-8") !== data) {
            fs.writeFileSync(Path, data.replace(/\r?\n/g, "\r\n"), "utf-8");
        }
    } else {
        fs.writeFileSync(Path, data.replace(/\r?\n/g, "\r\n"), "utf-8");
    };
}

async function convert() {
    /**
     * index.htmlの作成
     */
    async function createIndexHTML() {
        const dom = new JSDOM(fs.readFileSync("./templateHTML/homepate.html", "utf-8"));
        const document = dom.window.document;

        // headタグにogPrefixを追加
        document.head.setAttribute("prefix", ogPrefix);

        // 共有ヘッダーをhomepate.htmlのヘッダーにマージ、そしてogpに関する情報をheadタグに追加
        document.head.innerHTML = getHeaderShare() + document.head.innerHTML + createOGPrefix({
            title: "みはるのホームページ",
            description: "みはるのホームページです。",
            image: "https://www.miharu.blog/imageSource/ogp.png",
            alt: "みはるのホームページ",
            url: "https://www.miharu.blog/",
            siteName: "みはるのホームページ",
            twitterCard: "summary_large_image"
        });

        // headerの内容を設定
        const header = document.getElementsByTagName("header")[0];
        if (header) header.innerHTML = fs.readFileSync("./templateHTML/header.html", "utf-8");

        // footerの内容を設定
        const footer = document.getElementsByTagName("footer")[0];
        if (footer) footer.innerHTML = fs.readFileSync("./templateHTML/footer.html", "utf-8");

        const blogInfo = getBlogInfoJSON();
        const genreExplanation = getGenreExplanationJSON();
        const blogListUL = (() => {
            const blogListUL = document.getElementById("blogList");
            if (!blogListUL) {
                const blogListSection = document.getElementById("blogList");
                if (!blogListSection) {
                    throw new Error("No blogList section found.");
                }
                const ul = document.createElement("ul");
                ul.id = "blogListUL";
                blogListSection.appendChild(ul);
            }
            return document.getElementById("blogListUL") as HTMLUListElement;
        })();
        for (let i = 0; i !== Object.keys(blogInfo).length; i++) {
            const info = blogInfo[i];
            const markdownText = fs.readFileSync("./markdownSource/" + i + "/" + i + ".md", "utf-8");
            const li = document.createElement("li");
            if (!info.created) li.classList.add("nocreated");
            if (info.incomplete) li.classList.add("incomplete");
            const leftDiv = document.createElement("div");
            leftDiv.classList.add("left");
            const rightDiv = document.createElement("div");
            rightDiv.classList.add("right");
            const title = document.createElement("p");
            const link = document.createElement("a");
            link.href = "./" + blogInfo[i].genre + "/" + i + "/";
            link.innerHTML = info.title;
            title.appendChild(link);
            leftDiv.appendChild(title);
            const box = document.createElement("span");
            box.classList.add("box");
            const textBox = document.createElement("span");
            textBox.classList.add("textBox");
            if (info.topImageName) {
                const img = document.createElement("img");
                img.src = "./" + blogInfo[i].genre + "/" + i + "/" + info.topImageName;
                rightDiv.appendChild(img);
            }
            if (markdownText) {
                const blogContent = document.createElement("span");
                blogContent.classList.add("blogContent");
                blogContent.innerHTML = (await marked(markdownText.split("\n")[0])).replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, '');
                textBox.appendChild(blogContent);
            }
            const span = document.createElement("span");
            span.classList.add("miniInfo");
            const timestamp = document.createElement("span");
            timestamp.id = "timestamp";
            timestamp.innerHTML = info.timestamp;
            const popup = document.createElement("span");
            popup.classList.add("popup");
            const popupBody = document.createElement("span");
            popupBody.classList.add("popupBody");
            const timeArray = String(info.timestamp).split("/");
            popupBody.innerHTML = timeArray[0] + "年" + timeArray[1] + "月" + timeArray[2] + "日";
            popup.appendChild(popupBody);
            timestamp.appendChild(popup);
            span.appendChild(timestamp);
            const hyphen = document.createElement("span");
            hyphen.id = "hyphen";
            hyphen.innerHTML = "-";
            span.appendChild(hyphen);
            const genre = document.createElement("span");
            genre.id = "genre";
            genre.innerHTML = info.genre;
            if (genreExplanation[info.genre] && genreExplanation[info.genre].alt) {
                const popup = document.createElement("span");
                popup.classList.add("popup");
                const popupBody = document.createElement("span");
                popupBody.classList.add("popupBody");
                popupBody.innerHTML = "説明\n" + genreExplanation[info.genre].alt;
                popup.appendChild(popupBody);
                genre.appendChild(popup);
            }
            span.appendChild(genre);
            if (!info.created) {
                const hyphen = document.createElement("span");
                hyphen.id = "hyphen";
                hyphen.innerHTML = "-";
                span.appendChild(hyphen);
                const created = document.createElement("span");
                created.id = "created";
                created.innerHTML = "執筆中";
                const popup = document.createElement("span");
                popup.classList.add("popup");
                const popupBody = document.createElement("span");
                popupBody.classList.add("popupBody");
                popupBody.innerHTML = "説明\n現在作成中の記事の時にこの表記が表示されます。";
                popup.appendChild(popupBody);
                created.appendChild(popup);
                span.appendChild(created);
            };
            if (info.incomplete) {
                const hyphen = document.createElement("span");
                hyphen.id = "hyphen";
                hyphen.innerHTML = "-";
                span.appendChild(hyphen);
                const incomplete = document.createElement("span");
                incomplete.id = "incomplete";
                incomplete.innerHTML = "不完全な記事";
                const popup = document.createElement("span");
                popup.classList.add("popup");
                const popupBody = document.createElement("span");
                popupBody.classList.add("popupBody");
                popupBody.innerHTML = "説明\n記事の内容が未完全であったり不完全である時にこの表記が表示されます。";
                popup.appendChild(popupBody);
                incomplete.appendChild(popup);
                span.appendChild(incomplete);
            };

            textBox.appendChild(span);
            box.appendChild(textBox);
            leftDiv.appendChild(box);
            li.appendChild(leftDiv);
            li.appendChild(rightDiv);

            blogListUL.appendChild(li);
        }

        const about = document.getElementById("about");
        if (about) about.innerHTML = await marked(fs.readFileSync("./markdownSource/aboutSite.md", "utf-8"));

        const blogQuantity = document.getElementById("blogQuantity");
        if (blogQuantity) blogQuantity.innerHTML = "記事数: " + Object.keys(blogInfo).length.toString();

        const text = dom.serialize();

        writeFileSyncCRLF("index.html", text);
    }
    // 記事毎のHTMLを作成する関数
    async function createBlogHTML() {
        const blogInfo = getBlogInfoJSON();
        for (let i = 0; i !== Object.keys(blogInfo).length; i++) {
            const dom = new JSDOM(fs.readFileSync("./templateHTML/blogView.html", "utf-8"));
            const document = dom.window.document;

            const markdownText = fs.readFileSync("./markdownSource/" + i + "/" + i + ".md", "utf-8");

            // headタグにogPrefixを追加
            document.head.setAttribute("prefix", ogPrefix);

            // 共有ヘッダーをhomepate.htmlのヘッダーにマージ、そしてogpに関する情報をheadタグに追加
            document.head.innerHTML = getHeaderShare() + document.head.innerHTML + createOGPrefix({
                title: blogInfo[i].title,
                description: (await marked(markdownText.split("\n")[0])).replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, ''),
                image: (blogInfo[i].topImageName !== undefined) ? "https://www.miharu.blog/" + blogInfo[i].genre + "/" + i + "/" + blogInfo[i].topImageName : undefined,
                url: "https://www.miharu.blog/" + blogInfo[i].genre + "/" + i + "/",
                siteName: "みはるのホームページ",
                twitterCard: "summary_large_image"
            });

            document.title = blogInfo[i].title + " - miharu";
            const metaKeyword = document.createElement("meta");
            metaKeyword.name = "keywords";
            metaKeyword.content = (() => {
                let string = "";
                for (const keyword of blogInfo[i].keyword) {
                    if (string !== "") string += ",";
                    string += keyword;
                }
                return string
            })();
            document.head.appendChild(metaKeyword);

            // headerの内容を設定
            const header = document.getElementsByTagName("header")[0];
            if (header) header.innerHTML = fs.readFileSync("./templateHTML/header.html", "utf-8");

            // footerの内容を設定
            const footer = document.getElementsByTagName("footer")[0];
            if (footer) footer.innerHTML = fs.readFileSync("./templateHTML/footer.html", "utf-8");

            const fragment = document.createDocumentFragment();
            const title = document.createElement("h1");
            title.innerHTML = blogInfo[i].title;
            fragment.appendChild(title);
            const status = document.createElement("span");
            status.classList.add("status");
            status.innerHTML = (() => {
                let string = "";
                const array: string[] = [];
                array.push("ジャンル: " + blogInfo[i].genre);
                array.push("記事作成日: " + blogInfo[i].timestamp);
                if (blogInfo[i].editTimestamp) array.push("記事更新日: " + blogInfo[i].editTimestamp);
                array.push((() => {
                    let string = "";
                    const array: string[] = [];
                    const keyword = blogInfo[i].keyword;
                    array.push("タグ: " + keyword.pop());
                    array.push(...blogInfo[i].keyword);
                    for (const str of array) {
                        if (string !== "") string += "、";
                        string += str;
                    }
                    return string;
                })());
                for (const str of array) {
                    if (string !== "") string += "　";
                    string += str;
                }
                return string;
            })();
            fragment.appendChild(status);

            if (blogInfo[i].topImageName) {
                // pの中にimgを入れる
                const p = document.createElement("p");
                const img = document.createElement("img");
                img.id = "topImage";
                img.classList.add("ignorePreview");
                img.src = "./" + blogInfo[i].topImageName;
                p.appendChild(img);
                fragment.appendChild(p);
            }

            if (!blogInfo[i].created) {
                const notes = document.createElement("p");
                const boldText = document.createElement("strong");
                boldText.innerHTML = "この記事は現在執筆中により不完全な内容が記載されている恐れがあります。申し訳ありませんが、参考程度にお願いいたします。";
                notes.appendChild(boldText);
                notes.innerHTML += "もし記事の内容が空っぽである場合、ほかのサイトへ回っていただくことをおすすめします。";
                fragment.appendChild(notes);
                const h2 = document.createElement("h2");
                h2.innerHTML = "本題";
                fragment.appendChild(h2);
            }

            const range = document.createRange();
            range.selectNodeContents(fragment);
            const renderer = new marked.Renderer();
            renderer.code = ({ text, lang }) => {
                const validLanguage = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
                const highlighted = hljs.highlight(text, { language: validLanguage }).value;
                return `<pre><code class="hljs ${validLanguage}">${highlighted}</code></pre>`;
            };

            const documentFragment = range.createContextualFragment(await marked(markdownText, { renderer }));
            const top = documentFragment.children[1];

            const indexBox = document.createElement("div");
            indexBox.classList.add("indexBox");
            const indexSpan = document.createElement("span");
            indexBox.appendChild(indexSpan);
            const indexTitle = document.createElement("p");
            indexTitle.innerHTML = "目次";
            indexSpan.appendChild(indexTitle);
            const indexOl = document.createElement("ol");
            indexOl.classList.add("indexOl");
            indexSpan.appendChild(indexOl);
            documentFragment.insertBefore(indexBox, top);
            fragment.appendChild(documentFragment);

            const index: { text: string; id: string; h3: { text: string; id: string; h4: { text: string; id: string; h5: []; }[]; }[]; }[] = [];
            let indexh2: { text: string; id: string; h3: { text: string; id: string; h4: { text: string; id: string; h5: []; }[]; }[]; } | undefined;
            for (const Ele of fragment.children) {
                const element = Ele as HTMLElement;
                switch (element.tagName) {
                    case "H2": {
                        if (indexh2) index.push(indexh2);
                        indexh2 = { text: element.innerHTML, id: element.innerHTML, h3: [] };
                        element.id = indexh2.id;
                        break;
                    }
                    case "H3": {
                        if (!indexh2) indexh2 = { text: "", id: "", h3: [] };
                        const json = { text: element.innerHTML, id: element.innerHTML, h4: [] }
                        indexh2.h3.push(json);
                        element.id = json.id;
                        break;
                    }
                    case "H4": {
                        if (!indexh2) indexh2 = { text: "", id: "", h3: [] };
                        const h3 = (() => {
                            if (!indexh2.h3[indexh2.h3.length - 1]) indexh2.h3.push({ text: "", id: "", h4: [] });
                            return indexh2.h3[indexh2.h3.length - 1];
                        })();
                        const json = { text: element.innerHTML, id: element.innerHTML, h5: [] as [] };
                        h3.h4.push(json);
                        element.id = json.id;
                        break;
                    }
                }
            }
            if (indexh2) index.push(indexh2);
            if (index.length >= 1) {
                for (const h2 of index) {
                    const li = document.createElement("li");
                    const a = document.createElement("a");
                    a.href = "#" + h2.id;
                    a.innerHTML = h2.text;
                    li.appendChild(a);
                    indexOl.appendChild(li);
                    if (h2.h3.length >= 1) {
                        const ol = document.createElement("ol");
                        for (const h3 of h2.h3) {
                            const li = document.createElement("li");
                            const a = document.createElement("a");
                            a.href = "#" + h3.id;
                            a.innerHTML = h3.text;
                            li.appendChild(a);
                            ol.appendChild(li);
                            if (h3.h4.length >= 1) {
                                const ol2 = document.createElement("ol");
                                for (const h4 of h3.h4) {
                                    const li = document.createElement("li");
                                    const a = document.createElement("a");
                                    a.href = "#" + h4.id;
                                    a.innerHTML = h4.text;
                                    li.appendChild(a);
                                    ol2.appendChild(li);
                                }
                                ol.appendChild(ol2);
                            }
                        }
                        indexOl.appendChild(ol);
                    }
                };
            } else indexBox.style.display = "none";
            const content = document.getElementById("content");
            if (content) content.appendChild(fragment);

            const blogQuantity = document.getElementById("blogQuantity");
            if (blogQuantity) blogQuantity.innerHTML = "記事数: " + Object.keys(blogInfo).length.toString();

            const text = dom.serialize();

            writeFileSyncCRLF(blogInfo[i].genre + "/" + i + "/index.html", text);

            // markdownSource[i]フォルダに入っているデータをコピー(あれば)
            if (fs.existsSync("./markdownSource/" + i)) {
                if (!fs.existsSync(cacheData.miharuBlogRepositoryFolderPath + blogInfo[i].genre + "/" + i)) {
                    fs.mkdirSync(cacheData.miharuBlogRepositoryFolderPath + blogInfo[i].genre + "/" + i);
                }
                const files = fs.readdirSync("./markdownSource/" + i);
                for (const file of files) {
                    fs.writeFileSync(cacheData.miharuBlogRepositoryFolderPath + blogInfo[i].genre + "/" + i + "/" + file, fs.readFileSync("./markdownSource/" + i + "/" + file));
                }
            }
        }
    }
    async function createSiteMapTxt() {
        const baseSiteMap = fs.readFileSync("./baseSiteMap.txt", "utf-8");
        const blogInfo = getBlogInfoJSON();
        let siteMap = baseSiteMap;
        for (let i = 0; i !== Object.keys(blogInfo).length; i++) siteMap += "https://www.miharu.blog/" + blogInfo[i].genre + "/" + i + "/\n";
        writeFileSyncCRLF("sitemap.txt", siteMap);
    }

    async function srcFolderCreate() {
        function copyFiles(srcPath: fs.PathLike, destPath: string) {
            const files = fs.readdirSync(srcPath);
            for (const file of files) {
                const srcFile = `${srcPath}/${file}`;
                const destFile = `${destPath}/${file}`;
                if (fs.statSync(srcFile).isDirectory()) {
                    if (!fs.existsSync(cacheData.miharuBlogRepositoryFolderPath + destFile)) fs.mkdirSync(cacheData.miharuBlogRepositoryFolderPath + destFile);
                    copyFiles(srcFile, destFile);
                } else {
                    // .d.tsとts、scss、css.mapファイルを除外してコピー
                    if (!(file.match(/\.d\.ts$/) || file.match(/\.ts$/) || file.match(/\.scss$/) || file.match(/\.css\.map$/))) {
                        fs.writeFileSync(cacheData.miharuBlogRepositoryFolderPath + destFile, fs.readFileSync(srcFile));
                    };
                }
            }
        }
        if (!fs.existsSync(cacheData.miharuBlogRepositoryFolderPath + "src/img")) fs.mkdirSync(cacheData.miharuBlogRepositoryFolderPath + "src/img", { recursive: true });

        copyFiles("./src", "src");
        copyFiles("./imageSource", "src/img");

        // imageSourceフォルダをsrc/imgにコピー
        if (!fs.existsSync(cacheData.miharuBlogRepositoryFolderPath + "src/img")) {
            fs.mkdirSync(cacheData.miharuBlogRepositoryFolderPath + "src/img");
        };
    }
    await createIndexHTML();
    await createBlogHTML();
    await createSiteMapTxt();
    await srcFolderCreate();
}

convert();
