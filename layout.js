function calculateMobileLayout(eventCount, containerWidth, containerHeight, slideWidth, slideHeight) {
  const milestonePoints = [];
  const slidePositions = [];
  const connectorData = [];

  const edgeMarginY = containerHeight * 0.1;
  const usableHeight = containerHeight - edgeMarginY * 2;
  const segmentHeight = usableHeight / Math.max(1, eventCount - 1);
  const pathX = containerWidth / 2;

  let pathDefinition = `M ${pathX} ${edgeMarginY}`;

  for (let i = 0; i < eventCount; i++) {
    const y = edgeMarginY + i * segmentHeight;
    milestonePoints.push({ x: pathX, y });
    pathDefinition += ` L ${pathX} ${y}`;

    const slideX = (i % 2 === 0) ? (pathX - slideWidth - 30) : (pathX + 30);
    const slideY = y - (slideHeight / 2);
    slidePositions.push({ x: slideX, y: slideY });

    const startPoint = { x: (i % 2 === 0) ? slideX + slideWidth : slideX, y: y };
    const angle = Math.atan2(y - startPoint.y, pathX - startPoint.x);
    const distance = Math.sqrt(Math.pow(pathX - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
    connectorData.push({ startPoint, angle, distance });
  }

  return {
    pathDefinition,
    milestonePoints,
    slidePositions,
    connectorData,
  };
}

function calculateLayout(eventCount, containerWidth, containerHeight, slideWidth, slideHeight, isMobile) {
  if (isMobile) {
    return calculateMobileLayout(eventCount, containerWidth, containerHeight, slideWidth, slideHeight);
  }

  // --- 0. Safety Check for No Events ---
  if (eventCount === 0) {
    return {
      pathDefinition: '',
      milestonePoints: [],
      slidePositions: [],
      connectorData: [],
    };
  }

  // --- 1. Define Parameters & Margins ---
  const edgeMarginX = containerWidth * 0.1;
  const edgeMarginY = containerHeight * 0.1;
  const usableWidth = containerWidth - edgeMarginX * 2;
  const usableHeight = containerHeight - edgeMarginY * 2;

  // --- 2. Generate Milestone Dot Positions ---
  const milestonePoints = [];
  const segmentWidth = usableWidth / Math.max(1, eventCount - 1);
  for (let i = 0; i < eventCount; i++) {
    const x = edgeMarginX + i * segmentWidth;
    let y = edgeMarginY + usableHeight * (i % 2 === 0 ? 0.35 : 0.65);
    y += (Math.random() - 0.5) * usableHeight * 0.15;
    y = Math.max(edgeMarginY, Math.min(y, containerHeight - edgeMarginY));
    milestonePoints.push({ x, y });
  }

  // --- 3. Generate Smooth Path through Dots (Bézier Spline) ---
  let pathDefinition = `M ${milestonePoints[0].x} ${milestonePoints[0].y}`;
  const tension = 0.4;

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
  const placedSlides = [];
  const dotRadius = 15;

  function isColliding(rect) {
    if (rect.x < 0 || rect.x + rect.width > containerWidth ||
        rect.y < 0 || rect.y + rect.height > containerHeight) {
      return true; // Check screen boundaries
    }
    for (const other of placedSlides) {
      if (rect.x < other.x + other.width && rect.x + rect.width > other.x &&
          rect.y < other.y + other.height && rect.y + rect.height > other.y) {
        return true; // Check against other slides
      }
    }
    for (const dot of milestonePoints) {
      const dist = Math.sqrt(Math.pow(rect.x + slideWidth / 2 - dot.x, 2) + Math.pow(rect.y + slideHeight / 2 - dot.y, 2));
      if (dist < (slideWidth / 2 + dotRadius * 2)) { // Increased radius for more spacing
        return true; // Check against milestone dots
      }
    }
    return false;
  }

  milestonePoints.forEach((point, index) => {
    let finalPosition;
    let foundPosition = false;
    const step = 10;
    let stepsInDirection = 1;
    let stepCount = 0;
    let direction = 0;
    let searchX = point.x;
    let searchY = point.y;
    
    // Determine if this is a peak or trough based on path generation logic
    const isPeak = index % 2 === 0; // Even indices are peaks (higher positions)
    const isTrough = !isPeak; // Odd indices are troughs (lower positions)

    for (let i = 0; i < 500; i++) {
      const rect = { x: searchX - slideWidth / 2, y: searchY - slideHeight / 2, width: slideWidth, height: slideHeight };
      if (!isColliding(rect)) {
        finalPosition = rect;
        foundPosition = true;
        break;
      }
      switch (direction) {
        case 0: searchX += step; break;
        case 1: searchY += step; break;
        case 2: searchX -= step; break;
        case 3: searchY -= step; break;
      }
      stepCount++;
      if (stepCount >= stepsInDirection) {
        stepCount = 0;
        direction = (direction + 1) % 4;
        if (direction === 0 || direction === 2) {
          stepsInDirection++;
        }
      }
    }

    if (!foundPosition) {
      finalPosition = { x: point.x - slideWidth / 2, y: edgeMarginY, width: slideWidth, height: slideHeight };
      console.warn(`Could not find a non-colliding position for slide ${index}. Using fallback.`);
    }

    placedSlides.push(finalPosition);
    
    // Adjust slide position based on peak/trough
    let adjustedY = finalPosition.y - 50; // Default adjustment
    if (isTrough) {
      // For troughs, lower the slide position much further
      adjustedY = finalPosition.y + 80; // Position well below the trough dot
    }
    
    slidePositions.push({ x: finalPosition.x, y: adjustedY });

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
