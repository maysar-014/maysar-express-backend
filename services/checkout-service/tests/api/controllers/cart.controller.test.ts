import { CartController } from '../src/api/controllers/cart.controller';

describe('CartController', () => {
  it('should create valid value object', () => {
    const vo = new CartController('test-value');
    expect(vo).toBeDefined();
  });

  it('should be immutable', () => {
    const vo = new CartController('test');
    expect(() => { (vo as any).value = 'new'; }).toThrow();
  });

  it('should compare by value', () => {
    const vo1 = new CartController('test');
    const vo2 = new CartController('test');
    expect(vo1.equals(vo2)).toBe(true);
  });
});
