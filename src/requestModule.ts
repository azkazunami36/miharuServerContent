export function request(url: string | URL) {
    const request = new XMLHttpRequest();
    request.open("GET", url, false);
    const etag = localStorage.getItem("etag-" + url);
    const cachedData = localStorage.getItem("cachedData-" + url);
    if (etag !== null && cachedData !== null) request.setRequestHeader("If-None-Match", etag);
    request.send(null);
    if (request.status === 200) {
        const etag = request.getResponseHeader("ETag");
        if (etag !== null) {
            localStorage.setItem("etag-" + url, etag);
        }
        localStorage.setItem("cachedData-" + url, request.responseText);
        return request.responseText
    } else if (request.status === 304) return localStorage.getItem("cachedData-" + url);
}
