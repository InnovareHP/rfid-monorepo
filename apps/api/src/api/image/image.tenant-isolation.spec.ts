import { ForbiddenException } from "@nestjs/common";

jest.mock("cloudinary", () => ({
  v2: {
    uploader: {
      destroy: jest.fn((_id, cb) => cb(null, { result: "ok" })),
      upload_stream: jest.fn(),
    },
  },
}));

import { v2 } from "cloudinary";
import { ImageService } from "./image.service";

const ORG = "org-a";
const destroy = v2.uploader.destroy as unknown as jest.Mock;

describe("ImageService ownership", () => {
  let service: ImageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ImageService();
  });

  it("refuses a public id outside the caller's folder", async () => {
    await expect(
      service.deleteImage("uploads/org-b/receipt", ORG)
    ).rejects.toThrow(ForbiddenException);

    expect(destroy).not.toHaveBeenCalled();
  });

  it("refuses a legacy unfoldered public id", async () => {
    await expect(service.deleteImage("uploads/receipt", ORG)).rejects.toThrow(
      ForbiddenException
    );
  });

  it("refuses a prefix collision on a longer scope id", async () => {
    await expect(
      service.deleteImage("uploads/org-a-evil/receipt", ORG)
    ).rejects.toThrow(ForbiddenException);
  });

  it("deletes a public id inside the caller's folder", async () => {
    await service.deleteImage("uploads/org-a/receipt", ORG);

    expect(destroy).toHaveBeenCalledWith(
      "uploads/org-a/receipt",
      expect.any(Function)
    );
  });
});
