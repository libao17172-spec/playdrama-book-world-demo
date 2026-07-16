const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function clampToWorld(position, world) {
  const padding = world.padding ?? 0;
  const walkable = world.walkable ?? { left: padding, top: padding, right: world.width - padding, bottom: world.height - padding };
  return {
    x: Math.min(walkable.right, Math.max(walkable.left, position.x)),
    y: Math.min(walkable.bottom, Math.max(walkable.top, position.y)),
  };
}

export function getFacing(x, y, previous = 'away') {
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? 'left' : 'right';
  if (Math.abs(y) > 0) return y < 0 ? 'away' : 'toward';
  return previous;
}

export function isNodeInteractable(position, node) {
  if (!node?.world2d) return false;
  return distance(position, node.world2d) <= (node.world2d.interactionRadius ?? 120);
}

export function getNearestNode(position, nodes) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const node of nodes) {
    if (!node.world2d) continue;
    const currentDistance = distance(position, node.world2d);
    if (currentDistance <= (node.world2d.interactionRadius ?? 120) && currentDistance < nearestDistance) {
      nearest = node;
      nearestDistance = currentDistance;
    }
  }
  return nearest;
}

export function getRouteProgress(route, deepened) {
  const completedIds = new Set(deepened);
  const completed = route.filter((id) => completedIds.has(id)).length;
  const nextId = route.find((id) => !completedIds.has(id)) ?? null;
  return {
    completed,
    total: route.length,
    ratio: route.length ? completed / route.length : 1,
    done: completed === route.length,
    nextId,
  };
}
