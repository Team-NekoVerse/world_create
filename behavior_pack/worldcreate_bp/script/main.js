import { world, system } from "@minecraft/server";
import { getPositionsFromTags, getArea } from "./utils.js";

// --- 範囲選択 ---
world.afterEvents.itemUseOn.subscribe(event => {
  const player = event.source;
  const item = event.itemStack;
  const block = event.block;

  if (!player || !item || item.typeId !== "minecraft:stick") return;
  const pos = block.location;

  if (!player.hasTag("pos1")) {
    player.addTag(`pos1:${pos.x},${pos.y},${pos.z}`);
    player.sendMessage(`§a[WorldCreate] 開始点を設定: §r${pos.x}, ${pos.y}, ${pos.z}`);
  } else if (!player.hasTag("pos2")) {
    player.addTag(`pos2:${pos.x},${pos.y},${pos.z}`);
    player.sendMessage(`§a[WorldCreate] 終了点を設定: §r${pos.x}, ${pos.y}, ${pos.z}`);
  } else {
    player.sendMessage(`§e[WorldCreate] 範囲はすでに設定済みです。" /create reset "でリセットしてください。`);
  }
});

// --- チャット入力監視 ---
world.beforeEvents.chatSend.subscribe(event => {
  const player = event.sender;
  const message = event.message.trim();
  if (!message.startsWith("/create")) return;

  event.cancel = true; // 通常コマンド送信をキャンセル
  const args = message.split(" ");
  const sub = args[1];

  // --- /create reset ---
  if (sub === "reset") {
    for (const tag of player.getTags()) {
      if (tag.startsWith("pos1:") || tag.startsWith("pos2:")) player.removeTag(tag);
    }
    player.sendMessage("§a[WorldCreate] 範囲をリセットしました。");
    return;
  }

  // --- /create fill <block> ---
  if (sub === "fill") {
    const blockType = args[2];
    if (!blockType) {
      player.sendMessage("§c[WorldCreate] 使用法: /create fill <ブロックID>");
      return;
    }

    const { pos1, pos2 } = getPositionsFromTags(player);
    if (!pos1 || !pos2) {
      player.sendMessage("§e[WorldCreate] 2箇所座標を指定してください。");
      return;
    }

    const dim = player.dimension;
    const area = getArea(pos1, pos2);

    player.sendMessage(`§b[WorldCreate] 範囲を ${blockType} で埋めています`);

    // ブロックを順に置き換える（大きい範囲ではラグる）
    system.run(async () => {
      let count = 0;
      for (let x = area.minX; x <= area.maxX; x++) {
        for (let y = area.minY; y <= area.maxY; y++) {
          for (let z = area.minZ; z <= area.maxZ; z++) {
            try {
              const block = dim.getBlock({ x, y, z });
              block.setType(blockType);
              count++;
            } catch (e) {}
          }
        }
      }
      player.sendMessage(`§a[WorldCreate] 埋め立て完了 (${count} ブロック)。`);
    });
  }

  // --- 不明なサブコマンド ---
  else {
    player.sendMessage("§7[WorldCreate] コマンド一覧: fill / reset");
  }
});
