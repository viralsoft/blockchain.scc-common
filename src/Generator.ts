import * as fs from 'fs';

export class Generator {
  public readonly coin: string;
  public readonly coinNameDetails: string;

  public ignoreFiles: string[] = ['node_modules', 'package-lock.json', '.env'];

  constructor(coin: string, coinNameDetails: string) {
    this.coin = coin;
    this.coinNameDetails = coinNameDetails;
  }

  public start() {
    this.walk('./libs/sota-btc');
    this.walk('./bin/btc');
    console.log('Generate code for', this.coin, 'successfully!');
  }

  /**
   * Walk to every file and its child
   * @param dir
   */
  public walk(dir: fs.PathLike) {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = dir + '/' + file;
      const stat = fs.statSync(file);
      let checkFile: boolean = true;
      this.ignoreFiles.map(fileName => {
        if (file.match(new RegExp(fileName, 'g'))) {
          // ignore
          checkFile = false;
          return;
        }
      });

      if (!checkFile) {
        return;
      }
      if (stat && stat.isDirectory()) {
        /* Recurse into a subdirectory */
        results = results.concat(this.walk(file));
      } else {
        /* Is a file */
        console.log(file);
        this.genFromTemplate(file);
      }
    });
    return results;
  }

  /**
   * uppercase first letter
   * @param data
   */
  public ucFirst(data: string): string {
    return data.charAt(0).toUpperCase() + data.slice(1);
  }

  /**
   * uppercase all letter
   * @param data
   */
  public ucAll(data: string): string {
    return data.toUpperCase();
  }

  /**
   * generate all folder and sub folder from any path if missing it
   * @param path
   */
  public generateDirectory(path: string): void {
    const childDirectories = path.split('/');
    let growthPath = '';
    for (const child of childDirectories) {
      growthPath += child + '/';
      if (!fs.existsSync(growthPath)) {
        fs.mkdirSync(growthPath);
      }
    }
  }

  /**
   * seperate full path of a file into its path and its file name
   * @param path
   */
  public separateFullPath(path: string): any {
    const index = path.lastIndexOf('/');
    return {
      fileName: path.substring(index + 1),
      path: path.substring(0, index + 1),
    };
  }

  /**
   * Replace template content to its new
   * @param fullPath
   */
  // Input path format: ./sota-btc/src/BtcWithdrawalPicker.ts
  public genFromTemplate(fullPath: string): void {
    let genPath = fullPath.replace('btc', this.coin);
    genPath = genPath.replace('Btc', this.ucFirst(this.coin));
    const handledPath = this.separateFullPath(genPath);

    let content = fs.readFileSync(fullPath, 'utf8');

    content = content.replace(/Btc/g, this.ucFirst(this.coin));
    content = content.replace(/btc/g, this.coin);
    content = content.replace(/BTC/g, this.ucAll(this.coin));
    content = content.replace(/Bitcoin/g, this.coinNameDetails);

    this.generateDirectory(handledPath.path);
    fs.writeFile(genPath, content, err => {
      if (err) {
        console.log(err);
      }
    });
  }
}
