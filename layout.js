function calculateLayout(eventCount, containerWidth, containerHeight) {
  // --- 1. Define Parameters & Margins ---
  const edgeMarginX = containerWidth * 0.05;
  const edgeMarginY = containerHeight * 0.05;
  const usableWidth = containerWidth - edgeMarginX * 2;
  const usableHeight = containerHeight - edgeMarginY * 2;

  // --- 2. Generate Milestone Dot Positions ---
  const milestonePoints = [];
  const segmentWidth = usableWidth / Math.max(1, eventCount - 1);
  for (let i = 0; i < eventCount; i++) {
    const x = edgeMarginX + i * segmentWidth;
    // Simple alternating pattern for now to ensure no path overlap
    let y = edgeMarginY + usableHeight * (i % 2 === 0 ? 0.25 : 0.75);
    // Add some randomness
    y += (Math.random() - 0.5) * usableHeight * 0.2;
    // Clamp to vertical margins
    y = Math.max(edgeMarginY, Math.min(y, containerHeight - edgeMarginY));
    milestonePoints.push({ x, y });
  }

  // --- 3. Generate Smooth Path through Dots (Bézier Spline) ---
  let pathDefinition = `M ${milestonePoints[0].x} ${milestonePoints[0].y}`;
  const tension = 0.4; // Controls the curviness

  for (let i = 0; i < milestonePoints.length - 1; i++) {
    const p0 = milestonePoints[i - 1] || milestonePoints[i];
    const p1 = milestonePoints[i];
    const p2 = milestonePoints[i + 1];
    const p3 = milestonePoints[i + 2] || p2;

    const cp1_dx = (p2.x - p0.x) * tension;
    const cp1_dy = (p2.y - p0.y) * tension;
    const cp1 = { x: p1.x + cp1_dx, y: p1.y + cp1_dy };

    const cp2_dx = (p3.x - p1.x) * tension;
    const cp2_dy = (p3.y - p1.y) * tension;
    const cp2 = { x: p2.x - cp2_dx, y: p2.y - cp2_dy };

    pathDefinition += ` C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p2.x},${p2.y}`;
  }

  // --- 4. Position Slides with Collision Detection ---
  const slidePositions = [];
  const connectorData = [];
  const placedSlides = []; // Stores bounding boxes of placed slides
    const slideWidth = 140;
  const slideHeight = 200;
  const dotRadius = 15; // A larger radius for collision checking

  function isColliding(rect) {
    // Check screen boundaries
    if (rect.x < edgeMarginX || rect.x + rect.width > containerWidth - edgeMarginX ||
        rect.y < edgeMarginY || rect.y + rect.height > containerHeight - edgeMarginY) {
      return true;
    }

    // Check against other slides
    for (const other of placedSlides) {
      if (rect.x < other.x + other.width && rect.x + rect.width > other.x &&
          rect.y < other.y + other.height && rect.y + rect.height > other.y) {
        return true;
      }
    }

    // Check against all milestone dots (not just the current one)
    for (const dot of milestonePoints) {
        const dist = Math.sqrt(Math.pow(rect.x + slideWidth/2 - dot.x, 2) + Math.pow(rect.y + slideHeight/2 - dot.y, 2));
        if (dist < (slideWidth/2 + dotRadius)) { // Simplified circular check
            return true;
        }
    }
    
    // Note: Path collision is implicitly handled by placing slides far from dots
    // and the path generation logic which keeps the path near the dots.

    return false;
  }

  milestonePoints.forEach((point, index) => {
        const safeDistance = 80;
    const candidatePositions = [
      { x: point.x - slideWidth / 2, y: point.y - slideHeight - safeDistance }, // Top
      { x: point.x - slideWidth / 2, y: point.y + safeDistance }, // Bottom
      { x: point.x + safeDistance, y: point.y - slideHeight / 2 }, // Right
      { x: point.x - slideWidth - safeDistance, y: point.y - slideHeight / 2 }, // Left
    ];

    const scoredPositions = candidatePositions
      .map(pos => {
        const rect = { x: pos.x, y: pos.y, width: slideWidth, height: slideHeight };
        // The score is the sum of the distances to the nearest horizontal and vertical edges.
        // This favors positions that are more centered in available space.
        const dist_h = Math.min(rect.x - edgeMarginX, containerWidth - edgeMarginX - (rect.x + rect.width));
        const dist_v = Math.min(rect.y - edgeMarginY, containerHeight - edgeMarginY - (rect.y + rect.height));
        const score = dist_h + dist_v;

        return { rect, score, is_colliding: isColliding(rect) };
      })
      .filter(p => !p.is_colliding)
      .sort((a, b) => b.score - a.score); // Sort by score descending

    let finalPosition;
    if (scoredPositions.length > 0) {
      finalPosition = scoredPositions[0].rect;
    } else {
      // Fallback if all positions collide, just take the first candidate
      finalPosition = { x: candidatePositions[0].x, y: candidatePositions[0].y, width: slideWidth, height: slideHeight };
      console.warn(`Could not find a non-colliding position for slide ${index}. Using fallback.`);
    }

    placedSlides.push(finalPosition);
    slidePositions.push({ x: finalPosition.x, y: finalPosition.y });

    // Connector line data: from dot to the closest point on the slide's edge
    const connectionPointX = Math.max(finalPosition.x, Math.min(point.x, finalPosition.x + slideWidth));
    const connectionPointY = Math.max(finalPosition.y, Math.min(point.y, finalPosition.y + slideHeight));
    const startPoint = { x: connectionPointX, y: connectionPointY };

    const angle = Math.atan2(point.y - startPoint.y, point.x - startPoint.x);
    const distance = Math.sqrt(Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2));

    connectorData.push({ startPoint, angle, distance });
  });

  // --- 5. Return Layout Data ---
  return {
    pathDefinition,
    milestonePoints,
    slidePositions,
    connectorData,
  };
}
