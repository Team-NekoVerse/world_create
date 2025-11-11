import { world, system, ItemStack, ItemTypes, Player, MinecraftDimensionTypes, ModalFormData } from "@minecraft/server";
import { getPositionsFromTags, getArea, clearPosTags } from "./utils.js";

const clipboard = new Map(); // プレイヤー別コピー範囲データ

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
    player.sendMessage("§e[WorldCreate] 範囲が設定済みです。/create reset またはメニューからリセットしてください。");
  }
});

// --- 本を使ってUIメニューを開く ---
world.afterEvents.itemUse.subscribe(event => {
  const player = event.source;
  const item = event.itemStack;
  if (!player || !item) return;
  if (item.typeId === "minecraft:book") {
    openMenu(player);
  }
});

// --- UIメニューを表示する関数 ---
function openMenu(player) {
  const form = new ModalFormData()
    .title("WorldCreate メニュー")
    .dropdown("操作を選択:", ["fill", "replace", "copy", "paste", "reset"])
    .textField("ブロックID（fill / replaceで使用）", "minecraft:stone")
    .textField("置換対象ブロックID（replace時のみ）", "minecraft:dirt");

  form.show(player).then(res => {
    if (res.canceled) return;
    const [modeIndex, newBlock, oldBlock] = res.formValues;
    const mode = ["fill", "replace", "copy", "paste", "reset"][modeIndex];
    handleAction(player, mode, newBlock, oldBlock);
  });
}

// --- メニューからの処理実行 ---
function handleAction(player, mode, newBlock, oldBlock) {
  const { pos1, pos2 } = getPositionsFromTags(player);
  const dim = player.dimension;

  if (mode !== "reset" && (!pos1 || !pos2)) {
    player.sendMessage("§e[WorldCreate] まず棒で範囲を指定してください。");
    return;
  }

  switch (mode) {
    case "fill":
      fillArea(dim, pos1, pos2, newBlock, player);
      break;

    case "replace":
      replaceArea(dim, pos1, pos2, oldBlock, newBlock, player);
      break;

    case "copy":
      copyArea(dim, pos1, pos2, player);
      break;

    case "paste":
      pasteArea(dim, player);
      break;

    case "reset":
      clearPosTags(player);
      player.sendMessage("§a[WorldCreate] 範囲をリセットしました。");
      break;
  }
}

// --- Fill処理 ---
function fillArea(dim, pos1, pos2, blockType, player) {
  const area = getArea(pos1, pos2);
  player.sendMessage(`§b[WorldCreate] 範囲を ${blockType} で埋めています...`);
  system.run(() => {
    let count = 0;
    for (let x = area.minX; x <= area.maxX; x++) {
      for (let y = area.minY; y <= area.maxY; y++) {
        for (let z = area.minZ; z <= area.maxZ; z++) {
          try {
            dim.getBlock({ x, y, z }).setType(blockType);
            count++;
          } catch (e) {}
        }
      }
    }
    player.sendMessage(`§a[WorldCreate] fill 完了 (${count} ブロック)。`);
  });
}

// --- Replace処理 ---
function replaceArea(dim, pos1, pos2, oldBlock, newBlock, player) {
  const area = getArea(pos1, pos2);
  player.sendMessage(`§b[WorldCreate] ${oldBlock} → ${newBlock} に置換中...`);
  system.run(() => {
    let count = 0;
    for (let x = area.minX; x <= area.maxX; x++) {
      for (let y = area.minY; y <= area.maxY; y++) {
        for (let z = area.minZ; z <= area.maxZ; z++) {
          try {
            const b = dim.getBlock({ x, y, z });
            if (b.typeId === oldBlock) {
              b.setType(newBlock);
              count++;
            }
          } catch (e) {}
        }
      }
    }
    player.sendMessage(`§a[WorldCreate] 置換完了 (${count} ブロック)。`);
  });
}

// --- Copy処理 ---
function copyArea(dim, pos1, pos2, player) {
  const area = getArea(pos1, pos2);
  const blocks = [];
  for (let x = area.minX; x <= area.maxX; x++) {
    for (let y = area.minY; y <= area.maxY; y++) {
      for (let z = area.minZ; z <= area.maxZ; z++) {
        try {
          const block = dim.getBlock({ x, y, z });
          blocks.push({ rel: { x: x - area.minX, y: y - area.minY, z: z - area.minZ }, type: block.typeId });
        } catch (e) {}
      }
    }
  }
  clipboard.set(player.name, blocks);
  player.sendMessage(`§a[WorldCreate] ${blocks.length} ブロックをコピーしました。`);
}

// --- Paste処理 ---
function pasteArea(dim, player) {
  const blocks = clipboard.get(player.name);
  if (!blocks) {
    player.sendMessage("§e[WorldCreate] コピーされたデータがありません。");
    return;
  }
  const pos = player.location;
  player.sendMessage("§b[WorldCreate] 貼り付け中...");
  system.run(() => {
    let count = 0;
    for (const b of blocks) {
      try {
        const loc = {
          x: Math.floor(pos.x + b.rel.x),
          y: Math.floor(pos.y + b.rel.y),
          z: Math.floor(pos.z + b.rel.z)
        };
        dim.getBlock(loc).setType(b.type);
        count++;
      } catch (e) {}
    }
    player.sendMessage(`§a[WorldCreate] 貼り付け完了 (${count} ブロック)。`);
  });
}
