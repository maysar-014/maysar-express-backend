import express from 'express';
import request from 'supertest';
import { createOtpVerificationRouter } from './otp-verification.routes';

describe('otp verification routes', () => {
  it('verifies OTP via both compatibility endpoints', async () => {
    const verifyUseCase = {
      execute: jest.fn().mockResolvedValue(true)
    };

    const app = express();
    app.use(express.json());
    app.use(createOtpVerificationRouter(verifyUseCase as any));

    const verifyResponse = await request(app)
      .post('/verify')
      .send({ userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV', otp: '123456' });
    const aliasResponse = await request(app)
      .post('/verify-otp')
      .send({ userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV', otp: '123456' });

    expect(verifyResponse.status).toBe(200);
    expect(aliasResponse.status).toBe(200);
    expect(verifyUseCase.execute).toHaveBeenCalledTimes(2);
  });

  it('returns 401 for invalid OTP', async () => {
    const verifyUseCase = {
      execute: jest.fn().mockResolvedValue(false)
    };

    const app = express();
    app.use(express.json());
    app.use(createOtpVerificationRouter(verifyUseCase as any));

    const response = await request(app)
      .post('/verify-otp')
      .send({ userId: 'usr_01ARZ3NDEKTSV4RRFFQ69G5FAV', otp: '123456' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      verified: false
    }));
  });
});
