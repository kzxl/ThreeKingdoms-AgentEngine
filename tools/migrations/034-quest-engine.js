/**
 * Migration 034: quest & encounter engine.
 *
 * Five DB-authored questlines, one per career path. Each quest is 3 steps with
 * a stat check, a day cost, per-step rewards and a completion reward. The
 * runtime reads these tables; no quest text lives in UI code.
 */

const QUESTS = [
  {
    id: 'Q-MARTIAL-01', path: 'MARTIAL', order: 1,
    titleVi: 'Đường Võ Hiệp', titleEn: 'The Martial Road',
    descVi: 'Từ lôi đài Trác Huyện tới chỗ đứng của một danh tướng.',
    descEn: 'From the Zhuo arena to the standing of a famous general.',
    reward: { fame: 100, cash: 800, exp: { war: 40 } },
    steps: [
      {
        titleVi: 'Thử sức tại Lôi Đài', titleEn: 'Test yourself at the Arena',
        stat: 'war', dc: 12, days: 2,
        successVi: 'Bạn thắng ba trận liên tiếp; tiếng tăm võ nghệ bắt đầu lan trong huyện.',
        successEn: 'You win three bouts in a row; word of your skill spreads through the county.',
        failureVi: 'Đối thủ nhanh hơn bạn; khán đài im lặng, nhưng bạn học được một bài học đau.',
        failureEn: 'Your opponent is faster; the crowd goes quiet, but the lesson is sharp.',
        reward: { fame: 20, exp: { war: 20 } }
      },
      {
        titleVi: 'Dẹp sơn tặc ven quan đạo', titleEn: 'Clear bandits on the highway',
        stat: 'war', dc: 15, days: 2,
        successVi: 'Bạn đánh tan toán cướp, cứu được đoàn xe lương của dân làng.',
        successEn: 'You break the bandit band and save the village grain convoy.',
        failureVi: 'Toán cướp rút vào rừng; bạn bị thương và mất dấu chúng.',
        failureEn: 'The bandits slip into the woods; you are wounded and lose the trail.',
        reward: { fame: 35, cash: 250, exp: { war: 30, ldr: 15 } }
      },
      {
        titleVi: 'Nhận lệnh tiền phong', titleEn: 'Take the vanguard command',
        stat: 'war', dc: 18, days: 3,
        successVi: 'Chủ tướng trao cờ tiên phong; tên bạn được ghi vào quân lệnh.',
        successEn: 'The commander hands you the vanguard banner; your name enters the order of battle.',
        failureVi: 'Lệnh tiền phong vuột khỏi tay; bạn vẫn là một tay kiếm vô danh.',
        failureEn: 'The vanguard command slips away; you remain an unknown blade.',
        reward: { fame: 50, exp: { war: 40, ldr: 20 } }
      }
    ]
  },
  {
    id: 'Q-MERCHANT-01', path: 'MERCHANT', order: 2,
    titleVi: 'Mối Lớn Đông Môn', titleEn: 'The East Gate Contract',
    descVi: 'Một thương vụ đủ lớn để đổi vị thế của Lương gia.',
    descEn: 'A trade large enough to change the Liang clan standing.',
    reward: { fame: 90, cash: 1500, items: [{ code: 'COM-SILK', qty: 2 }] },
    steps: [
      {
        titleVi: 'Dò giá chợ Đông Môn', titleEn: 'Survey the East Gate prices',
        stat: 'com', dc: 12, days: 2,
        successVi: 'Bạn nắm được chênh lệch giá giữa các sạp trước khi phiên chợ mở.',
        successEn: 'You map the stall price gaps before the market opens.',
        failureVi: 'Giá biến động nhanh hơn dự tính; bạn mua hớ một lô nhỏ.',
        failureEn: 'Prices move faster than expected; you overpay for a small lot.',
        reward: { cash: 200, exp: { com: 25 } }
      },
      {
        titleVi: 'Đàm phán với thương hội', titleEn: 'Negotiate with the guild',
        stat: 'com', dc: 15, days: 2,
        successVi: 'Thương hội đồng ý mở tuyến giao hàng cho Lương gia.',
        successEn: 'The guild opens a delivery route for the Liang clan.',
        failureVi: 'Thương hội giữ giá; bạn phải chờ một phiên khác.',
        failureEn: 'The guild holds its price; you must wait for another session.',
        reward: { cash: 400, exp: { com: 30, dip: 15 } }
      },
      {
        titleVi: 'Chốt hợp đồng quân nhu', titleEn: 'Close the military supply contract',
        stat: 'com', dc: 18, days: 3,
        successVi: 'Hợp đồng quân nhu được ký; Lương gia trở thành mối quen của doanh trại.',
        successEn: 'The supply contract is signed; the Liang clan becomes a camp regular.',
        failureVi: 'Đối thủ cắt giá; hợp đồng tuột khỏi tay.',
        failureEn: 'A rival undercuts you; the contract slips away.',
        reward: { cash: 600, exp: { com: 35 } }
      }
    ]
  },
  {
    id: 'Q-SCHOLAR-01', path: 'SCHOLAR', order: 3,
    titleVi: 'Binh Thư Trong Mưa', titleEn: 'The Art of War in Rain',
    descVi: 'Một cuốn binh thư thất truyền và vị quân sư đang tìm nó.',
    descEn: 'A lost treatise and the strategist searching for it.',
    reward: { fame: 120, cash: 500, exp: { int: 40, pol: 30 } },
    steps: [
      {
        titleVi: 'Đọc bia đá cổ', titleEn: 'Read the old stone tablet',
        stat: 'int', dc: 12, days: 2,
        successVi: 'Bạn giải được đoạn văn khắc mờ, tìm ra manh mối đầu tiên.',
        successEn: 'You decode the faded inscription and find the first clue.',
        failureVi: 'Mưa xóa mất nét khắc; bạn phải chép lại từ trí nhớ.',
        failureEn: 'Rain erases the carving; you must reconstruct it from memory.',
        reward: { fame: 15, exp: { int: 25 } }
      },
      {
        titleVi: 'Tranh luận tại Sạp Trà', titleEn: 'Debate at the Tea Pavilion',
        stat: 'pol', dc: 15, days: 2,
        successVi: 'Bạn thuyết phục được nhóm danh sĩ rằng binh thư là thật.',
        successEn: 'You convince the scholars that the treatise is genuine.',
        failureVi: 'Một danh sĩ bắt bẻ; buổi luận đàm kết thúc mà không ngã ngũ.',
        failureEn: 'A scholar corners you; the debate ends without a verdict.',
        reward: { fame: 30, exp: { pol: 25, dip: 15 } }
      },
      {
        titleVi: 'Trình binh thư lên chủ tướng', titleEn: 'Present the treatise to the commander',
        stat: 'int', dc: 18, days: 3,
        successVi: 'Chủ tướng nhận binh thư, phong bạn làm mưu sĩ trong doanh.',
        successEn: 'The commander accepts the treatise and names you a camp strategist.',
        failureVi: 'Chủ tướng cho rằng binh thư là ngụy tạo; cánh cửa mưu sĩ khép lại.',
        failureEn: 'The commander dismisses the treatise as a forgery; the strategist door closes.',
        reward: { fame: 50, exp: { int: 40, pol: 30 } }
      }
    ]
  },
  {
    id: 'Q-ARTISAN-01', path: 'ARTISAN', order: 4,
    titleVi: 'Bí Kíp Lò Rèn', titleEn: 'The Forge Secret',
    descVi: 'Một lò rèn cũ, một bí kíp tôi thép, và một món nợ phải trả.',
    descEn: 'An old forge, a steel-quenching secret, and a debt to settle.',
    reward: { fame: 80, cash: 600, items: [{ code: 'WPN-BESPOKE', qty: 1 }] },
    steps: [
      {
        titleVi: 'Sửa bễ lò rèn hỏng', titleEn: 'Repair the broken forge bellows',
        stat: 'cra', dc: 12, days: 2,
        successVi: 'Bễ lò chạy lại, ngọn lửa đủ nóng để thử mẻ thép đầu tiên.',
        successEn: 'The bellows breathe again; the flame is hot enough for a first steel batch.',
        failureVi: 'Bễ rách thêm; bạn mất một ngày sửa lại từ đầu.',
        failureEn: 'The bellows tear further; you lose a day rebuilding from scratch.',
        reward: { cash: 150, exp: { cra: 25 } }
      },
      {
        titleVi: 'Tôi thép theo bí kíp', titleEn: 'Quench steel by the secret method',
        stat: 'cra', dc: 15, days: 2,
        successVi: 'Mẻ thép đạt độ dẻo hiếm; lão thợ gật đầu công nhận.',
        successEn: 'The steel reaches a rare flexibility; the old smith nods in approval.',
        failureVi: 'Thép giòn và nứt; bạn phải nấu lại.',
        failureEn: 'The steel turns brittle and cracks; you must re-smelt it.',
        reward: { cash: 300, exp: { cra: 30 } }
      },
      {
        titleVi: 'Rèn món binh khí cuối', titleEn: 'Forge the final weapon',
        stat: 'cra', dc: 18, days: 3,
        successVi: 'Món binh khí hoàn thành dưới tay bạn, sáng đến mức lão thợ phải nheo mắt.',
        successEn: 'The weapon leaves your hands bright enough to make the old smith squint.',
        failureVi: 'Một vết nứt chạy dọc lưỡi; món binh khí phải bỏ.',
        failureEn: 'A crack runs down the blade; the weapon is ruined.',
        reward: { fame: 30, exp: { cra: 40 } }
      }
    ]
  },
  {
    id: 'Q-LINEAGE-01', path: 'LINEAGE', order: 5,
    titleVi: 'Gia Phả Lưu Danh', titleEn: 'A Name in the Clan Register',
    descVi: 'Ghi tên Lương gia vào sổ hương ước trước khi thế hệ sau tiếp bước.',
    descEn: 'Enter the Liang name in the county register before the next generation takes over.',
    reward: { fame: 110, cash: 700, exp: { dip: 30, pol: 30 } },
    steps: [
      {
        titleVi: 'Thăm hỏi hương lão', titleEn: 'Visit the village elders',
        stat: 'dip', dc: 12, days: 2,
        successVi: 'Các hương lão nhớ tới Lương gia và đồng ý nghe tiếp.',
        successEn: 'The elders remember the Liang clan and agree to hear you out.',
        failureVi: 'Một hương lão nghi ngờ nguồn gốc gia tộc; cuộc nói chuyện khép lại.',
        failureEn: 'An elder doubts the clan lineage; the conversation closes.',
        reward: { fame: 15, exp: { dip: 20 } }
      },
      {
        titleVi: 'Dàn xếp tranh chấp đất đai', titleEn: 'Settle a land dispute',
        stat: 'pol', dc: 15, days: 2,
        successVi: 'Bạn chia đất hợp lý, hai họ cùng ký vào biên bản.',
        successEn: 'You divide the land fairly; both families sign the record.',
        failureVi: 'Một bên bỏ về; tranh chấp vẫn treo.',
        failureEn: 'One side walks out; the dispute remains open.',
        reward: { fame: 30, cash: 200, exp: { pol: 25 } }
      },
      {
        titleVi: 'Khắc tên vào sổ hương ước', titleEn: 'Inscribe the name in the register',
        stat: 'dip', dc: 18, days: 3,
        successVi: 'Tên Lương gia được khắc vào sổ hương ước, truyền lại cho đời sau.',
        successEn: 'The Liang name is carved into the county register for later generations.',
        failureVi: 'Quan huyện trì hoãn; tên vẫn chưa được khắc.',
        failureEn: 'The magistrate delays; the name remains unrecorded.',
        reward: { fame: 50, exp: { dip: 35, pol: 25 } }
      }
    ]
  }
];

module.exports = {
  id: '034-quest-engine',
  description: 'Add quest definitions, steps and per-player progress',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS master_quests (
        quest_id TEXT PRIMARY KEY,
        title_vi TEXT NOT NULL,
        title_en TEXT NOT NULL,
        path_code TEXT NOT NULL,
        min_stage INTEGER NOT NULL DEFAULT 1,
        description_vi TEXT,
        description_en TEXT,
        reward_json TEXT DEFAULT '{}',
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS master_quest_steps (
        step_id TEXT PRIMARY KEY,
        quest_id TEXT NOT NULL,
        step_index INTEGER NOT NULL,
        title_vi TEXT NOT NULL,
        title_en TEXT NOT NULL,
        stat TEXT NOT NULL,
        dc INTEGER NOT NULL,
        days_cost INTEGER NOT NULL DEFAULT 2,
        success_vi TEXT,
        success_en TEXT,
        failure_vi TEXT,
        failure_en TEXT,
        reward_json TEXT DEFAULT '{}',
        UNIQUE(quest_id, step_index)
      );
      CREATE TABLE IF NOT EXISTS player_quests (
        player_id TEXT NOT NULL,
        quest_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        current_step INTEGER NOT NULL DEFAULT 0,
        attempts INTEGER NOT NULL DEFAULT 0,
        started_date TEXT,
        completed_date TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(player_id, quest_id)
      );
    `);

    const quest = db.prepare(`
      INSERT OR REPLACE INTO master_quests
        (quest_id, title_vi, title_en, path_code, min_stage, description_vi, description_en, reward_json, sort_order)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?);
    `);
    const step = db.prepare(`
      INSERT OR REPLACE INTO master_quest_steps
        (step_id, quest_id, step_index, title_vi, title_en, stat, dc, days_cost,
         success_vi, success_en, failure_vi, failure_en, reward_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    for (const q of QUESTS) {
      quest.run(
        q.id, q.titleVi, q.titleEn, q.path, q.descVi, q.descEn,
        JSON.stringify(q.reward || {}), q.order
      );
      q.steps.forEach((s, index) => {
        step.run(
          `${q.id}-S${index + 1}`, q.id, index,
          s.titleVi, s.titleEn, s.stat, s.dc, s.days,
          s.successVi, s.successEn, s.failureVi, s.failureEn,
          JSON.stringify(s.reward || {})
        );
      });
    }
    console.log(`      ${QUESTS.length} quests and ${QUESTS.length * 3} steps ready`);
  }
};
