export class ImageInfo {
    public url: string;
    public manifest: any; // TODO: Create a Typescript interface for this

    constructor(url: string) {
        this.url = url;
    }

    public async loadManifest() {
        const response = await axios.get(`${this.url}/json`);
        this.manifest = response.any;

        return this.manifest;
    }
}
