-- 由 scripts/gen-seed.mjs 自 content.json 產生，請勿手改。可重複執行。
-- 全部寫入 schema panpan（不碰 public）。
begin;

-- 體驗模組
insert into panpan.experience_modules (slug, name, category) values ('nail', '美甲', 'beauty')
  on conflict (slug) do update set name = excluded.name, category = excluded.category;
insert into panpan.experience_modules (slug, name, category) values ('hair', '美髮', 'beauty')
  on conflict (slug) do update set name = excluded.name, category = excluded.category;
insert into panpan.experience_modules (slug, name, category) values ('brow', '絨霧眉', 'beauty')
  on conflict (slug) do update set name = excluded.name, category = excluded.category;
insert into panpan.experience_modules (slug, name, category) values ('lip', '霧唇改色', 'beauty')
  on conflict (slug) do update set name = excluded.name, category = excluded.category;
insert into panpan.experience_modules (slug, name, category) values ('photo', '寫真', 'memory')
  on conflict (slug) do update set name = excluded.name, category = excluded.category;

-- 體驗 SET
insert into panpan.experience_sets (slug, code, name, tagline, description, headline, body, photo_label, status, sort_order)
values ('nail-photo', 'SET 01', '美甲 × 寫真', '從指尖開始，漂亮一次', '留一點時間給自己，也替愛自己的這一刻，留下紀念。', '從心漂亮一次', array['重新開始，不一定需要很大的決定。', '從指尖開始，也從心開始——漂亮，是為了重新看見自己。', '再用一張照片，記下那天正好好愛著自己的妳。']::text[], '美甲 × 寫真 主視覺', 'published', 1)
on conflict (slug) do update set code = excluded.code, name = excluded.name, tagline = excluded.tagline,
  description = excluded.description, headline = excluded.headline, body = excluded.body,
  photo_label = excluded.photo_label, sort_order = excluded.sort_order, updated_at = now();
insert into panpan.experience_sets (slug, code, name, tagline, description, headline, body, photo_label, status, sort_order)
values ('hair-photo', 'SET 02', '美髮 × 寫真', '換一個模樣，也換一個心情', '剪掉一點過去，留下重新開始那一天的樣子。', '剪掉一點過去，留住一個全新的自己。', array['剪短一點、換個髮色，或只是好好整理一次自己。', '不是成為另一個人，而是看見不一樣的自己。', '把重新喜歡上自己的那一刻，好好拍下來。']::text[], '美髮 × 寫真 主視覺', 'published', 2)
on conflict (slug) do update set code = excluded.code, name = excluded.name, tagline = excluded.tagline,
  description = excluded.description, headline = excluded.headline, body = excluded.body,
  photo_label = excluded.photo_label, sort_order = excluded.sort_order, updated_at = now();
insert into panpan.experience_sets (slug, code, name, tagline, description, headline, body, photo_label, status, sort_order)
values ('nail-brow-lip', 'SET 03', '美甲 × 絨霧眉／霧唇改色', '從細節開始，喜歡現在的自己', '眉眼、唇色與指尖，讓喜歡自己，成為每天的日常。', '在意自己的每個細節，生活也會跟著亮起來。', array['整理眉型、調整唇色，再為指尖換上喜歡的樣子。', '小小的改變，讓妳每天照鏡子時，都想多看自己一眼。', '喜歡自己，不必等到特別的日子。']::text[], '眉眼・唇色・指尖 主視覺', 'published', 3)
on conflict (slug) do update set code = excluded.code, name = excluded.name, tagline = excluded.tagline,
  description = excluded.description, headline = excluded.headline, body = excluded.body,
  photo_label = excluded.photo_label, sort_order = excluded.sort_order, updated_at = now();
insert into panpan.experience_set_modules (set_id, module_id)
  select s.id, m.id from panpan.experience_sets s, panpan.experience_modules m
  where s.slug = 'nail-photo' and m.slug in ('nail', 'photo')
on conflict do nothing;
insert into panpan.experience_set_modules (set_id, module_id)
  select s.id, m.id from panpan.experience_sets s, panpan.experience_modules m
  where s.slug = 'hair-photo' and m.slug in ('hair', 'photo')
on conflict do nothing;
insert into panpan.experience_set_modules (set_id, module_id)
  select s.id, m.id from panpan.experience_sets s, panpan.experience_modules m
  where s.slug = 'nail-brow-lip' and m.slug in ('nail', 'brow', 'lip')
on conflict do nothing;

-- 心語文章
insert into panpan.whispers (slug, no, theme, title, subtitle, body, letter_to, letter, published, sort_order)
values ('01-the-beginning', '01', '故事的起點', '我不是離開一個人，而是離開一種讓自己慢慢枯萎的生活', '不是因為恨，而是因為我也想好好活著。', '> 我不是離開一個人。我是離開一種，讓自己慢慢枯萎的生活。
這句話，是我走過一段婚姻之後，才真正明白的事。
以前的我，總覺得一段關係既然開始了，就應該努力走下去。遇到問題，就想辦法解決。發生爭執，就試著溝通。感到失望，就告訴自己再等等。我總以為，只要願意努力，就能讓關係回到原本的樣子。
我不是沒有期待過，也不是沒有努力過。只是後來我發現，有些關係裡最令人疲憊的，不一定是一次激烈的爭吵，而是那些日復一日累積的失望。
是一次次想說的話，最後又吞回心裡。是遇到困難時，明明很希望有人能一起面對，最後卻還是告訴自己：「算了，我自己來。」是生活看起來仍然繼續，自己卻慢慢失去了期待。
## 能夠獨立，不代表不需要陪伴
我一直知道，自己是可以獨立生活的人。遇到事情，我會想辦法處理。有責任需要承擔，我會努力完成。很多事情，即使沒有人幫忙，我也能想辦法走過去。
但後來我才明白，能夠自己扛，不代表應該一直自己扛。能夠獨立，不代表不渴望陪伴。能夠照顧自己，也不代表不需要被理解。
我想要的，從來不是有人替我解決人生裡所有的問題。我只是希望，在一段關係裡，我們可以一起面對生活。當其中一個人累了，另一個人願意接住他。當其中一個人遇到困難，不需要每次都獨自想辦法。當我們對未來有不同的想法，仍然願意坐下來，好好聽聽彼此的聲音。
我想要的不是一個讓我失去獨立能力的人，而是一個即使我有能力照顧自己，仍然願意與我並肩同行的人。
> 因為愛不是誰依賴誰。而是兩個人都可以成為完整的自己，卻仍然願意一起生活。
## 我不想再用委屈自己，換取關係的完整
我曾經很習慣替別人著想。遇到事情，會先考慮對方的感受。有些話明明很在意，卻會因為不想讓氣氛變得難看，而選擇不說。有些需求明明很重要，卻會告訴自己：「沒關係，我可以。」
久而久之，我好像很懂得體諒別人，卻不一定懂得替自己說話。我可以理解別人的難處，也可以替別人的行為尋找理由。可是，我卻慢慢忘記了一件事。
理解一個人，不代表我必須接受所有讓自己受傷的相處方式。
我可以承認對方也有他的困難，同時承認自己真的很累。我可以感謝一段關係曾經帶給我的一切，同時承認現在的自己已經不快樂。我也可以不恨一個人，卻選擇不再繼續原本的生活。
這些事情並不衝突。我不需要把對方變成壞人，才能證明自己的離開有道理。也不需要讓所有人都認同我的選擇，才有資格重新開始。有些決定，只能由真正走在那段路上的自己，慢慢承擔，也慢慢理解。
## 不是為了懲罰誰，而是我還想好好生活
我想活。我想重新笑。想在疲憊的時候安心休息，想重新期待明天，也想讓生活裡有一些單純而美好的事情。
我想好好陪伴孩子。想繼續感受世界的美好。想去看看沒有看過的風景，讀喜歡的書，照顧喜歡的花，也想繼續完成那些曾經放在心裡的夢想。
我不希望自己的人生，只剩下責任、忍耐與勉強。更不希望有一天，因為長期忽略自己的感受，而連原本擁有的溫柔與熱情，都漸漸消失。
所以，我選擇改變。不是為了懲罰誰，不是為了證明誰錯，而是因為我想讓自己，還有能力去愛孩子、愛世界，也愛未來的自己。
我不敢說，離開之後的生活就一定比較容易。人生不會因為做了一個決定，所有問題就突然消失。我仍然需要面對現實、承擔責任，也需要學習如何走過不確定的日子。
但至少，我開始願意正視自己的感受，也開始把自己的生命放回需要被照顧的位置。
我終於明白，告別不一定要帶著恨。有時候，我們可以帶著遺憾、感謝、難過，甚至還有一點不捨，依然選擇向前走。
因為我想要的，不只是結束一段讓自己疲憊的關係，而是重新建立一種，能讓自己好好生活的方式。
> 「我不是離開一個人，我是離開一種讓自己慢慢枯萎的生活。」不是因為恨。而是因為，我想真正的活出自己。
—— 朵朵曉語', '寫給也曾在關係裡弄丟自己的妳', '妳可以愛一個人，也可以珍惜一段關係。但請不要忘記，妳自己，也是那個值得被好好照顧的人。', true, 1)
on conflict (slug) do update set no = excluded.no, theme = excluded.theme, title = excluded.title,
  subtitle = excluded.subtitle, body = excluded.body, letter_to = excluded.letter_to,
  letter = excluded.letter, sort_order = excluded.sort_order;
insert into panpan.whispers (slug, no, theme, title, subtitle, body, letter_to, letter, published, sort_order)
values ('02-coming-home', '02', '回到自己', '我不是失去了一個家，而是開始回家', '有些告別，不是為了離開誰，而是為了重新找回自己。', '曾經，我以為自己是在失去一個家。
我花了很長的時間，努力維持一段婚姻，努力守住一個家庭，也努力扮演好每一個我以為自己應該扮演的角色。我以為，只要再努力一點、再體諒一點、再忍耐一點，也許事情就會慢慢變好。
我習慣替別人著想，習慣把話放在心裡，也習慣在遇到問題的時候，先想著自己還能做些什麼。好像只要我再多做一點，就能讓一切維持原本的樣子。
> 可是，日子久了，我漸漸忘記問自己一個問題：在努力照顧所有人的同時，我有沒有好好照顧自己？
## 原來，一個家不只是有沒有在一起
我們常常把家想像成一個具體的地方。有房子、有家人、有共同生活的日常，有一個看起來完整的家庭。
但後來我慢慢明白，一個家真正重要的，也許不只是有沒有人在身邊，而是當我們回到這個地方時，能不能安心地做自己。能不能放心地說出心裡的話。能不能在疲憊的時候被理解，而不是永遠都要表現得很堅強。能不能在遇到困難時，感受到自己不是一個人承擔所有事情。
我曾經以為，只要一家人還在一起，就代表我還擁有一個家。直到後來才發現，原來即使身邊有人，即使生活裡有許多責任與牽掛，一個人仍然可能感到孤單。
那種孤單，不一定是沒有人陪伴。而是妳明明已經很努力了，卻漸漸不知道，還能向誰說說自己的疲憊。
## 離開，是我很不容易才做出的選擇
決定結束婚姻，並不是一個輕鬆的決定。我有孩子，有責任，有許多必須考慮的現實，也有對未來的不確定。
我知道，婚姻的結束不只關乎兩個人，還牽涉到孩子的生活、彼此的責任，以及接下來要如何重新安排人生。所以我沒有辦法只憑一時的情緒，決定自己往哪裡走。
我需要面對問題，也需要一次次整理自己的想法。我必須思考，什麼才是對孩子比較好的安排；也必須重新學習，如何在關係結束之後，繼續承擔身為父母的責任。
我希望這段婚姻可以好好結束。不是為了證明誰對誰錯，也不是為了爭出誰輸誰贏。而是即使我們不再是夫妻，仍然可以為孩子保留應有的尊重，盡力做好父母該做的事。
這是我對告別的理解。告別一段關係，不代表否定曾經的一切，也不代表從此就不需要負責任。只是我們終於承認，有些關係走到了必須改變的時候，而我們需要重新找到適合彼此的位置。
## 後來，我才知道自己真正想找回的是什麼
我不是想回到從前，也不是想成為一個從來沒有受過傷的人。我只是希望，有一天的自己，可以不用再透過別人的反應，決定自己值不值得被愛。
可以不必一直證明自己很好、不必凡事都自己扛，也不必為了維持一段關係，而習慣忽略自己的感受。我想重新找回那個可以安心生活、真誠表達、自由選擇，也仍然保有溫柔的自己。
> 我不是離開一個家，而是開始回家。那個家，不是一棟房子，也不是一張結婚證書，而是終於能安心住在自己心裡的那個自己。
我想，這就是我人生這一段路，最重要的學習。有些告別很痛。但痛，不一定代表我們做錯了選擇。有時候，它只是提醒我們，曾經珍惜的事物已經改變，而現在的自己，需要另一種生活。
如果妳也正站在人生的某個轉彎處，希望妳不用急著證明自己已經放下，也不用急著讓所有人理解妳的選擇。妳可以慢慢來。慢慢整理，慢慢往前走。
直到有一天，妳終於發現，原來自己一直在尋找的那個家，從來不只是某個人給予的歸屬。也是妳終於願意，好好接住自己的那一刻。
—— 朵朵曉語', '寫給正在人生轉彎處的妳', '願我們都有勇氣離開不再適合自己的生活，也有能力在往後的日子裡，慢慢建立一個讓自己安心的家。', true, 2)
on conflict (slug) do update set no = excluded.no, theme = excluded.theme, title = excluded.title,
  subtitle = excluded.subtitle, body = excluded.body, letter_to = excluded.letter_to,
  letter = excluded.letter, sort_order = excluded.sort_order;
insert into panpan.whispers (slug, no, theme, title, subtitle, body, letter_to, letter, published, sort_order)
values ('03-love-and-responsibility', '03', '愛與責任', '成為媽媽之後，我更想好好照顧自己', '寫給孩子，也寫給那些習慣把所有人放在自己前面的女人。', '成為媽媽之後，我的人生多了兩個很重要的牽掛。
很多決定，不再只是考慮自己。生活怎麼安排、時間怎麼分配、未來要怎麼走，都會想到孩子。即使自己很累，也會先想想孩子的需要。即使心裡有很多情緒，也會希望自己能好好照顧他們。
這大概是很多媽媽都有過的心情。我們總是很自然地，把孩子放在前面。不是因為不愛自己，而是因為愛得太深，有時候反而忘了，自己也需要被照顧。
## 婚姻的結束，並不代表父母責任的結束
決定結束婚姻時，我心裡有很多需要面對的事情。我不只要處理自己的情緒，也必須思考孩子接下來的生活。他們還在成長，需要穩定的陪伴，需要被理解，也需要知道，即使家庭的形式改變了，爸爸和媽媽對他們的愛與責任，仍然存在。
我知道，婚姻的結束會帶來改變。生活安排可能不同了，彼此相處的方式也需要重新調整。所以，我希望能夠在關係結束的過程裡，盡力為孩子找到適合的安排。
我們需要討論監護、照顧、扶養，以及未來如何共同承擔父母的責任。這些事情未必每一件都容易，但我希望自己在做決定時，記得最重要的原則：孩子的需要，不應該成為大人彼此較勁的工具。
> 因為婚姻可以結束。但對孩子的愛與責任，不應該因此消失。
## 我想給孩子的，不只是一個完整的家庭
曾經，我也會想，一個完整的家庭，是不是應該努力維持原本的樣子？是不是只要父母還在一起，孩子就會比較幸福？
可是後來，我開始思考，除了家庭的形式之外，孩子真正需要的，是什麼？我想，他們需要的不只是有人照顧生活起居。他們也需要感受到愛、尊重與安全感。
需要知道，遇到問題可以說出來。需要知道，難過的時候可以表達情緒。需要知道，愛一個人不代表要一直委屈自己，而一段關係也不應該讓人長期失去被理解的機會。
我不敢說，自己能給孩子所有完美的答案。但我希望，我可以透過自己的生活，讓他們慢慢理解：人生會有變化，關係可能會改變，有時候，我們會遇到很難的選擇。但無論發生什麼事，都可以試著誠實面對問題，為自己的選擇負責，也保留愛人的能力。
## 我也想讓孩子看見，一個努力生活的媽媽
我曾經很容易把自己放在最後面。只要孩子好、家人好、事情順利，好像自己累一點也沒有關係。但我漸漸明白，如果我一直把所有需要都壓下去，久而久之，也可能失去感受生活的力氣。
我不希望自己只是一個努力完成責任的媽媽。我也想是一個有喜好、有夢想、有情緒，會為一朵花開心，會為一本書感動，也會期待明天的女人。
不是因為孩子不重要。恰恰是因為孩子很重要，我才更希望自己能夠好好生活。
我希望他們看見的，不只是一個為他們付出一切的媽媽。也可以是一個懂得愛自己、尊重自己，遇到困難時願意尋找方法，做出選擇後願意承擔責任的媽媽。
## 愛孩子，也把自己放進愛裡面
現在的我，正在學習重新安排人生。學習如何在工作、孩子與自己的生活之間找到平衡。學習接受，有些事情不可能一次做到完美。也學習不再因為偶爾感到疲憊，就責怪自己不夠堅強。
我相信，媽媽不必成為一個永遠不會累、永遠不會難過的人。我們也可以有脆弱的時候。可以尋求支持。可以重新學習。可以在照顧別人的同時，也為自己留一點空間。
> 我想好好愛我的孩子。也想讓自己，有能力繼續好好愛這個世界。
—— 朵朵曉語', '寫給每一位總是把自己放在最後的媽媽', '妳不需要等到所有人都安頓好了，才有資格照顧自己。妳也是這個家裡，值得被關心、被理解、被好好愛著的人。', true, 3)
on conflict (slug) do update set no = excluded.no, theme = excluded.theme, title = excluded.title,
  subtitle = excluded.subtitle, body = excluded.body, letter_to = excluded.letter_to,
  letter = excluded.letter, sort_order = excluded.sort_order;
insert into panpan.whispers (slug, no, theme, title, subtitle, body, letter_to, letter, published, sort_order)
values ('04-the-birth', '04', '品牌的誕生', '為什麼我想為離婚，辦一場派對？', '從離婚派對的想法，談告別、儀式與重新開始的勇氣。', '如果有人問我，為什麼想為離婚辦一場派對？我想，這個想法或許和很多人對離婚的想像不太一樣。
對大多數人來說，離婚可能代表一段關係的結束、一個家庭的改變，也可能伴隨著失落、遺憾，甚至是不願意再提起的傷痛。而我也知道，走到這一步，並不是一件容易的事。
曾經對婚姻有過期待，對家庭有過想像，也曾經希望兩個人可以一起把日子過好。只是人生走著走著，有些事情終究和原本想像的不一樣。
當一段婚姻走到終點，我們除了要面對關係的結束，還得重新整理生活、家庭、身分，以及對未來的想像。有時候，真正困難的並不只是做出決定，而是決定之後，如何帶著過去的一切，繼續往前走。
> 所以，我想為自己的離婚辦一場派對。
不是因為我覺得離婚是一件值得慶祝的事，也不是想否定曾經的婚姻，更不是要用一場熱鬧的活動，掩蓋那些曾經發生過的難過。而是因為，我想為人生這個重要的轉折，留下一個不一樣的記號。
我不想只記得這段關係裡的遺憾，也不想讓離婚成為往後回想人生時，唯一能夠想起的事情。這段婚姻曾經是我生命的一部分。那些經歷、那些感受，以及一路走來的改變，也都成為現在的我。
我不需要假裝一切從未發生，也不必要求自己立刻放下所有情緒。我只是想試著用自己的方式，面對這個已經發生的轉變。
我希望這場派對，可以是一個新的起點。不是宣告從此以後的人生就會一帆風順，而是提醒自己，即使經歷過不如預期的事情，我仍然可以重新選擇，接下來想怎麼生活。
我依然是孩子的媽媽，也依然有需要承擔的責任。婚姻結束了，不代表親子之間的愛與責任也跟著結束。我不會因為恢復單身，就突然成為一個什麼都不害怕、什麼都能處理好的人。但我想給自己一個機會，重新認識自己，也重新想像未來的生活。
> 或許，這場派對真正想慶祝的，並不是離婚本身。而是走到這一天的自己。
那個曾經努力過、難過過，也終於願意面對人生轉變的自己。而這一次，我想更認真地聽聽自己的心聲，也更勇敢地為自己做出選擇。
我想好好告別的，不只是過去的一段婚姻，也是那個曾經不知道該如何繼續往前走的自己。接下來的日子，我希望自己能夠帶著過去給我的經驗，繼續生活、繼續成長，也慢慢把日子過成自己喜歡的樣子。
—— 朵朵曉語', '寫給正在告別的妳', '一段關係的結束，不代表人生就此失去可能。妳依然可以一步一步，找到適合自己的方向。', true, 4)
on conflict (slug) do update set no = excluded.no, theme = excluded.theme, title = excluded.title,
  subtitle = excluded.subtitle, body = excluded.body, letter_to = excluded.letter_to,
  letter = excluded.letter, sort_order = excluded.sort_order;
insert into panpan.whispers (slug, no, theme, title, subtitle, body, letter_to, letter, published, sort_order)
values ('05-the-future', '05', '品牌的未來', '我想把日子，慢慢過成自己喜歡的樣子', '從個人的重新開始，走向「朵朵曉語」想陪伴更多人的初衷。', '我知道，有些女人在走進婚姻之後，才慢慢發現，原來生活和自己曾經想像的模樣，可以有這麼大的差距。
有些委屈，不知道該向誰說。有些困難，即使說出口，也未必有人能夠理解。有時候，我們不是沒有努力過，只是走著走著，才發現，原來有些問題不是一個人努力就能解決；有些關係，也不是只要自己再多忍耐一點，就能回到最初的模樣。
在人前，我們依然扮演著好妻子、好媽媽、好女兒，或是一個什麼事情都能處理好的大人。但那些沒有說出口的疲憊、失落與無奈，也是真實存在的。
每個人的故事都不一樣。有人正在努力維持一段關係，有人還在思考該不該離開，有人已經做出了選擇，卻仍然要面對接下來的生活。我們都有各自的難題，也都有不容易被別人看見的那一面。
> 妳不需要因為自己正在經歷困難，就覺得是自己不夠好。
妳可以有不知所措的時候，可以暫時找不到答案，也可以在照顧別人很久之後，重新問問自己：我真正想要的是什麼？我希望未來的日子，過得像什麼模樣？除了扮演好每一個角色，我還能不能好好成為自己？
這些問題，不一定要今天就有答案。有時候，我們需要的不是另一個人告訴自己應該怎麼做，而是一個願意理解我們、陪我們整理思緒，讓我們可以慢慢找到方向的地方。
這也是我想開始「朵朵曉語」的原因。我想把自己走過的路、曾經有過的困惑，以及在生命轉折中慢慢學會的事，整理成文字、分享、活動與陪伴。我希望這裡不只是我說故事的地方，也能成為更多人願意停下來、聽聽自己心聲的地方。
> 妳不是唯一一個正在努力的人。
我們不必急著變得更好，也不必急著證明自己已經放下。就從看見自己的感受開始，從照顧好今天的自己開始。慢慢整理，慢慢前進。慢慢把日子，過成自己真正喜歡的樣子。
—— 朵朵曉語', '這裡是朵朵曉語', '陪妳，把日子慢慢過成自己喜歡的樣子。', true, 5)
on conflict (slug) do update set no = excluded.no, theme = excluded.theme, title = excluded.title,
  subtitle = excluded.subtitle, body = excluded.body, letter_to = excluded.letter_to,
  letter = excluded.letter, sort_order = excluded.sort_order;

-- 新生故事：僅為範例草稿。依品牌文件不得虛構會員案例 → 一律 published=false、consent_given=false。
insert into panpan.stories (slug, no, title, summary, consent_given, published)
values ('story-01', '故事一', '那一天，我決定為自己做一件事。', '從一個小小的念頭開始，為自己留下一段值得記住的時光。', false, false)
on conflict (slug) do update set no = excluded.no, title = excluded.title, summary = excluded.summary,
  consent_given = false, published = false;
insert into panpan.stories (slug, no, title, summary, consent_given, published)
values ('story-02', '故事二', '我想重新看見自己。', '有時候，改變不必很大。從重新整理自己的模樣開始，也許就能找回久違的感受。', false, false)
on conflict (slug) do update set no = excluded.no, title = excluded.title, summary = excluded.summary,
  consent_given = false, published = false;
insert into panpan.stories (slug, no, title, summary, consent_given, published)
values ('story-03', '故事三', '走過那段日子，我想對自己說……', '有些話，只有走過以後才懂。寫給曾經的自己，也留給正在路上的妳。', false, false)
on conflict (slug) do update set no = excluded.no, title = excluded.title, summary = excluded.summary,
  consent_given = false, published = false;

-- 站台設定
insert into panpan.site_settings (key, value) values
  ('show_roadmap', 'true'::jsonb),
  ('roadmap', '["妝髮 × 寫真","花藝 × 寫真","美麗 × 攝影 × 餐飲","儀式 × 生活體驗","跨品牌專業組合"]'::jsonb)
on conflict (key) do update set value = excluded.value;

commit;
