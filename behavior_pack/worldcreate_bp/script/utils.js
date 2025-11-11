export function getPositionsFromTags(player) {
  let pos1 = null, pos2 = null;
  for (const tag of player.getTags()) {
    if (tag.startsWith("pos1:")) {
      const [x, y, z] = tag.replace("pos1:", "").split(",").map(Number);
      pos1 = { x, y, z };
    }
    if (tag.startsWith("pos2:")) {
      const [x, y, z] = tag.replace("pos2:", "").split(",").map(Number);
      pos2 = { x, y, z };
    }
  }
  return { pos1, pos2 };
}

export function getArea(pos1, pos2) {
  const minX = Math.min(pos1.x, pos2.x);
  const minY = Math.min(pos1.y, pos2.y);
  const minZ = Math.min(pos1.z, pos2.z);
  const maxX = Math.max(pos1.x, pos2.x);
  const maxY = Math.max(pos1.y, pos2.y);
  const maxZ = Math.max(pos1.z, pos2.z);
  return { minX, minY, minZ, maxX, maxY, maxZ };
}
