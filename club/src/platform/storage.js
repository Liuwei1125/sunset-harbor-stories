import {SAVE_KEY,LEGACY_KEY,emptyProgress,validateProgress} from '../core/progress.js';

export class ProgressStore {
  constructor(storage){this.status='';try{this.storage=storage===undefined?globalThis.localStorage:storage;}catch{this.storage=null;this.status='浏览器存储暂不可用；本次可游玩，也可导出进度。';}}
  load(){
    try{
      const own=this.storage.getItem(SAVE_KEY);
      if(own){try{return validateProgress(own);}catch(error){this.status='新版存档损坏，已恢复默认进度；可重新导入备份。';return emptyProgress();}}
      const legacy=this.storage.getItem(LEGACY_KEY);
      if(legacy){const migrated=validateProgress(legacy);this.save(migrated);this.status='已复制旧版休闲进度，原版存档保持不变。';return migrated;}
    }catch(error){this.status='浏览器存储暂不可用；本次可游玩，也可导出进度。';}
    return emptyProgress();
  }
  save(progress){try{this.storage.setItem(SAVE_KEY,JSON.stringify(progress));return true;}catch(error){this.status='保存失败：请导出进度备份。';return false;}}
  import(text){if(text.length>3_000_000)throw Error('文件超过休闲存档的容量上限。');const next=validateProgress(text);this.save(next);return next;}
}
