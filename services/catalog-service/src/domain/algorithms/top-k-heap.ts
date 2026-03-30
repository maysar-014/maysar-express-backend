export class TopKHeap<T> {
  private heap: Array<{ item: T; score: number }> = [];
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  push(item: T, score: number): void {
    if (this.heap.length < this.maxSize) {
      this.heap.push({ item, score });
      this.bubbleUp(this.heap.length - 1);
    } else if (score > this.heap[0].score) {
      this.heap[0] = { item, score };
      this.siftDown(0);
    }
  }

  drain(): T[] {
    const sorted = this.heap.sort((a, b) => b.score - a.score);
    return sorted.map(h => h.item);
  }

  size(): number {
    return this.heap.length;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[index].score >= this.heap[parentIndex].score) break;
      
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  private siftDown(index: number): void {
    const length = this.heap.length;
    
    while (index < this.heap.length) {
      let smallest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (leftChild < length && this.heap[leftChild].score < this.heap[smallest].score) {
        smallest = leftChild;
      }

      if (rightChild < length && this.heap[rightChild].score < this.heap[smallest].score) {
        smallest = rightChild;
      }

      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}
