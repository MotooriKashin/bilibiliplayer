import JSZip from 'jszip';

interface IFile {
    folder: string;
    name: string;
    content: string;
}
export interface IImg {
    length: number;
    [key: string]: any;
}

export function loadBuffer(url: string): Promise<ArrayBuffer> {
    return new Promise((res, rej) => {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
            res(xhr['response']);
        };
        xhr.onerror = (error: any) => {
            rej(error);
        };
        xhr.send();
    });
}

const resource: { [key: string]: Promise<ArrayBuffer> } = {};

export function loadZipBuffer(url: string) {
    let src = url.replace('http://', '//');
    src = src.replace('https://', '//');
    if (src.indexOf('//') !== 0) {
        src = '//' + src;
    }
    resource[src] = resource[src] || loadBuffer(src);
    return resource[src];
}

export function unzip<T>(data: ArrayBuffer) {
    let jszip = new JSZip();
    return jszip
        .loadAsync(data)
        .then((zip: JSZip) => {
            const dataList: Promise<IFile>[] = [];
            for (let key in zip.files) {
                // 判断是否是目录
                if (!zip.files[key].dir) {
                    const name = zip.files[key].name;
                    if (/^__MACOSX/.test(name)) {
                        continue;
                    }
                    if (/\.(png|jpg|jpeg|gif)$/.test(name)) {
                        // 判断是否是图片格式
                        // 将图片转化为base64格式
                        const base = zip
                            .file(name)!
                            .async('base64')
                            .then((res: string) => {
                                const folder = name.split('/');
                                let last = folder.pop()!.split('.');
                                const key = last[0];
                                const type = last[1];
                                const fold = folder.pop();
                                return {
                                    folder: fold,
                                    name: key,
                                    content: `data:image/${type};base64,${res}`,
                                };
                            });
                        dataList.push(<any>base);
                    } else if (/\.(json)$/.test(name)) {
                        const base = zip
                            .file(name)!
                            .async('string')
                            .then((res: string) => {
                                const folder = name.split('/');
                                let last = folder.pop()!.split('.');
                                const key = last[0];
                                const type = last[1];
                                const fold = folder.pop();

                                const json = JSON.parse(res);
                                return {
                                    folder: fold,
                                    name: key,
                                    content: json,
                                };
                            });
                        dataList.push(<any>base);
                    }
                }
            }
            return dataList;
        })
        .then((list: Promise<IFile>[]) => {
            return Promise.all(list).then((dataList) => {
                const fold: T = {} as T;
                dataList.forEach((item: IFile) => {
                    (<any>fold)[item.folder] = fold[<keyof T>item.folder] || { length: 0 };
                    (<any>fold)[item.folder][item.name] = item.content;
                    (<any>fold)[item.folder].length += 1;
                });
                // console.log(fold)
                return fold;
            });
        });
}
