/**
 * Created by xuhe on 2017/6/8.
 */
import createChineseWhisper from './createChineseWhisper.js'

export default function CWLayout(nodeSprites) {
    let whisper = createChineseWhisper(nodeSprites);
    let changeRate = whisper.getChangeRate();
    while (changeRate > 0.001){
        whisper.step();
        changeRate = whisper.getChangeRate();
    }
    _.each(nodeSprites,function (node) {
        node.cluster = whisper.getClass(node.id);
        // console.log(node.cluster);
    });
}