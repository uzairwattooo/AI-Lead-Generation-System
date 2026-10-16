export const CONCEPT_OUTPUT_WIDTH = 1024;
export const MAX_CONCEPT_SEGMENTS = 6;

/** Cover every source row exactly once, without shrinking a long page into one poster. */
export function planConceptSegments(width: number, height: number) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) throw new Error("Invalid homepage dimensions.");
  const outputHeight = Math.round(height / width * CONCEPT_OUTPUT_WIDTH);
  const count = Math.max(1, Math.ceil(outputHeight / 1536));
  if (count > MAX_CONCEPT_SEGMENTS) throw new Error("This homepage is too long for a complete proposal within the generation limit. No partial concept was saved.");
  return Array.from({length:count},(_,index)=>{
    const top = Math.round(index * height / count);
    const bottom = Math.round((index + 1) * height / count);
    const outputTop = Math.round(index * outputHeight / count);
    const outputBottom = Math.round((index + 1) * outputHeight / count);
    return {index,top,height:bottom-top,outputTop,outputHeight:Math.max(1,outputBottom-outputTop)};
  });
}
