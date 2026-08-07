import { ForbiddenException } from "@nestjs/common";

const send = jest.fn().mockResolvedValue({});

jest.mock("../../config/app-config", () => ({
  appConfig: {
    AWS_REGION: "us-east-1",
    S3_UPLOADS_BUCKET: "test-bucket",
    API_URL: "https://api.test",
  },
}));
jest.mock("../../lib/s3/s3", () => ({
  s3: { send: (...args) => send(...args) },
}));
jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://signed.example/object"),
}));

import { ImageService } from "./image.service";

const ORG = "org-a";

describe("ImageService ownership", () => {
  let service: ImageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ImageService();
  });

  it("refuses a key outside the caller's prefix", async () => {
    await expect(
      service.deleteImage("private/org-b/receipt.png", ORG)
    ).rejects.toThrow(ForbiddenException);

    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a key with no scope segment", async () => {
    await expect(
      service.deleteImage("private/receipt.png", ORG)
    ).rejects.toThrow(ForbiddenException);
  });

  it("refuses a prefix collision on a longer scope id", async () => {
    await expect(
      service.deleteImage("private/org-a-evil/receipt.png", ORG)
    ).rejects.toThrow(ForbiddenException);
  });

  it("refuses a legacy cloudinary style key", async () => {
    await expect(
      service.deleteImage("uploads/org-a/receipt.png", ORG)
    ).rejects.toThrow(ForbiddenException);
  });

  it("deletes a key inside the caller's private prefix", async () => {
    await service.deleteImage("private/org-a/receipt.png", ORG);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("deletes a key inside the caller's public prefix", async () => {
    await service.deleteImage("public/org-a/logo.png", ORG);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("refuses to presign a key outside the caller's prefix", async () => {
    await expect(
      service.getViewUrl("private/org-b/receipt.png", ORG)
    ).rejects.toThrow(ForbiddenException);
  });

  it("presigns a key inside the caller's prefix", async () => {
    await expect(
      service.getViewUrl("private/org-a/receipt.png", ORG)
    ).resolves.toBe("https://signed.example/object");
  });
});
