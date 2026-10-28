-- Manual review data only. Never called by the app, dev launcher or Docker startup.
BEGIN;
LOCK TABLE notes IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO notes (content, category, author, created_at)
SELECT content, category, author, CURRENT_TIMESTAMP - make_interval(mins => age_minutes)
FROM (VALUES
  (E'今天下班绕了一点远路，\n意外遇见了很好看的晚霞。\n原来慢一点，真的会有好事发生。', 'daily', '示例 · 小满', 12),
  (E'买到了最后一束小雏菊，\n花店老板还送了一枝尤加利。\n把今天的小幸运分你一点。', 'joy', '示例 · 阿橙', 37),
  (E'想对正在读这张纸条的你说：\n不用每一天都很厉害，\n有好好吃饭、好好休息，也很了不起。', 'thoughts', '示例 · 一颗栗子', 70),
  (E'希望这个冬天，\n家人都平安，朋友都常见面，\n也能和喜欢的人一起晒晒太阳。', 'wishes', '示例 · 山间来信', 130),
  (E'楼下的猫今天终于愿意靠近我了。\n虽然只是为了那一点猫粮，\n但我还是开心了好久。', 'joy', '示例 · 半杯牛奶', 210),
  (E'把窗台上的绿萝搬到了阳光里，\n又给自己泡了一杯热茶。\n小小的房间，也有小小的春天。', 'daily', '示例 · 木木', 310),
  (E'最近开始学着不着急。\n花会开，路会慢慢清楚，\n我们也会长成自己喜欢的样子。', 'thoughts', '示例 · 听风', 420),
  (E'许个小愿望：\n今年可以学会做一碗好吃的面，\n然后做给妈妈尝尝。', 'wishes', '示例 · 阿禾', 550),
  (E'早餐店阿姨记住了我的口味。\n“还是少糖，对吧？”\n被人记得，是很温柔的一件事。', 'joy', '示例 · 清早', 760),
  (E'周末没有特别的安排。\n洗了床单，读了几页书，\n让风在房间里待了一整个下午。', 'daily', '示例 · 小岛', 980),
  (E'那些没有说出口的谢谢，\n今天借这面墙放在这里。\n谢谢曾经认真听我说话的人。', 'thoughts', '示例 · 植物朋友', 1250),
  (E'愿下一次出发，\n不是为了赶路，\n只是因为想去看看海。', 'wishes', '示例 · 南风', 1500),
  (E'今天的云很像刚烤好的吐司。\n抬头看了一会儿，\n突然觉得肚子饿了。', 'daily', '示例 · 慢慢来', 1900),
  (E'找到了小时候写给自己的信。\n里面说要做一个快乐的大人。\n好，明天继续努力快乐一下。', 'joy', '示例 · 旧信封', 2400),
  (E'如果今天有一点难，\n就先停在这里坐一会儿吧。\n明天的事情，明天再慢慢想。', 'thoughts', '示例 · 远山', 3100),
  (E'希望明年的今天，\n我种下的那棵小树已经长高一点。\n我也是。', 'wishes', '示例 · 青柠', 4300)
) AS samples(content, category, author, age_minutes)
WHERE NOT EXISTS (SELECT 1 FROM notes)
ORDER BY age_minutes DESC;
COMMIT;
