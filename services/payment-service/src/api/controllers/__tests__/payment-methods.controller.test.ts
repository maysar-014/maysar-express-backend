import { Request, Response } from "express";
import { PaymentMethodsController } from "../payment-methods.controller";
import { PaymentMethodConfigService } from "../../../config/payment-methods.config";

describe("PaymentMethodsController", () => {
  let controller: PaymentMethodsController;
  let mockConfig: {
    listPublic: jest.Mock;
    listAdminStatus: jest.Mock;
    validateAll: jest.Mock;
  };
  let mockReq: Partial<Request>;
  let mockRes: {
    status: jest.Mock;
    json: jest.Mock;
  };

  beforeEach(() => {
    mockConfig = {
      listPublic: jest.fn().mockReturnValue([
        {
          code: "mpesa",
          name: "M-Pesa",
          type: "mobile_money",
          status: "live",
          available: true,
        },
        {
          code: "halopesa",
          name: "HaloPesa",
          type: "mobile_money",
          status: "off",
          available: false,
        },
      ]),
      listAdminStatus: jest.fn().mockReturnValue([
        {
          code: "mpesa",
          name: "M-Pesa",
          type: "mobile_money",
          provider: "selcom",
          environment: "live",
          operationalStatus: "operational",
          configurationStatus: "configured",
          missingKeys: [],
          credentialsPresent: { API_KEY: true },
          lastValidatedAt: "2026-09-13T00:00:00.000Z",
        },
      ]),
      validateAll: jest.fn().mockReturnValue([]),
    };

    controller = new PaymentMethodsController(
      mockConfig as unknown as PaymentMethodConfigService,
    );

    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it("listPublic returns the authoritative discovery payload", () => {
    controller.listPublic(mockReq as Request, mockRes as unknown as Response);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: mockConfig.listPublic(),
    });
    // The serialized payload must never contain credential material.
    const body = JSON.stringify(mockRes.json.mock.calls[0][0]);
    expect(body).not.toContain("API_KEY");
    expect(body).not.toContain("secret");
  });

  it("listAdmin returns operational state plus misconfigured summary", () => {
    mockConfig.validateAll.mockReturnValue(["card", "bank_transfer"]);

    controller.listAdmin(mockReq as Request, mockRes as unknown as Response);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      data: mockConfig.listAdminStatus(),
      meta: {
        misconfiguredCodes: ["card", "bank_transfer"],
        misconfiguredCount: 2,
      },
    });
    const body = JSON.stringify(mockRes.json.mock.calls[0][0]);
    expect(body).not.toContain("secret");
  });
});
