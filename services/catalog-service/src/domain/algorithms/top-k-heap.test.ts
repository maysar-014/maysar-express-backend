import { TopKHeap } from './top-k-heap';

describe('TopKHeap', () => {
  it('keeps only top-k highest scores and drains sorted descending', () => {
    const heap = new TopKHeap<string>(3);
    heap.push('a', 10);
    heap.push('b', 30);
    heap.push('c', 20);
    heap.push('d', 15);
    heap.push('e', 40);

    expect(heap.size()).toBe(3);
    expect(heap.drain()).toEqual(['e', 'b', 'c']);
  });

  it('ignores lower scores when heap is full', () => {
    const heap = new TopKHeap<string>(2);
    heap.push('x', 50);
    heap.push('y', 45);
    heap.push('z', 10);

    expect(heap.size()).toBe(2);
    expect(heap.drain()).toEqual(['x', 'y']);
  });
});

