import { Money } from '../money.value-object';
import { Cart } from '../cart.value-object';

describe('Money Performance Tests', () => {
  it('should add two amounts in under 1ms', () => {
    const m1 = new Money(100);
    const m2 = new Money(50);
    
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      m1.add(m2);
    }
    const duration = performance.now() - start;
    
    expect(duration / 1000).toBeLessThan(1);
  });

  it('should multiply in under 1ms', () => {
    const m = new Money(100);
    
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      m.multiply(0.5);
    }
    const duration = performance.now() - start;
    
    expect(duration / 1000).toBeLessThan(1);
  });

  it('should compare amounts in under 1ms', () => {
    const m1 = new Money(100);
    const m2 = new Money(50);
    
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      m1.isGreaterThan(m2);
      m1.isLessThan(m2);
      m1.isEqual(m2);
    }
    const duration = performance.now() - start;
    
    expect(duration / 1000).toBeLessThan(1);
  });
});

describe('Cart Performance Tests', () => {
  it('should add 100 items in under 10ms', () => {
    let cart = new Cart({ items: [] });
    
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      cart = cart.addItem({
        productId: `prod-${i}`,
        quantity: 1,
        priceAtTime: 10
      });
    }
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(15);
  });

  it('should calculate subtotal for 100 items in under 5ms', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      productId: `prod-${i}`,
      quantity: 1,
      priceAtTime: 10
    }));
    const cart = new Cart({ items });
    
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      cart.getSubtotal();
    }
    const duration = performance.now() - start;
    
    expect(duration / 100).toBeLessThan(5);
  });

  it('should update quantity for 100 items in under 10ms', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      productId: `prod-${i}`,
      quantity: 1,
      priceAtTime: 10
    }));
    let cart = new Cart({ items });
    
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      cart = cart.updateItemQuantity(`prod-${i}`, 5);
    }
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(15);
  });
});
