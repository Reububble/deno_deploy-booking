declare const imports: any;

const im = document.createElement("script");
im.type = "importMap";
im.textContent = JSON.stringify({ imports });
document.currentScript!.after(im);
