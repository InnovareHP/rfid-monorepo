import { Injectable } from "@nestjs/common";
import { prisma } from "src/lib/prisma/prisma";
import { v4 as uuidv4 } from "uuid";
import { OnboardingDto } from "./dto/user.schema";

@Injectable()
export class UserService {
  async onboarding(onboardDto: OnboardingDto, userId: string) {
    const user = await prisma.user_table.update({
      where: {
        id: userId,
      },
      data: {
        user_image: onboardDto.profilePhoto,
        user_is_onboarded: true,
        user_onboarding_table: {
          upsert: {
            create: {
              user_onboarding_id: uuidv4(),
              user_onboarding_hear_about: onboardDto.foundUsOn,
              user_onboarding_how_to_use: onboardDto.purpose,
              user_onboarding_what_to_expect: onboardDto.interests.join(","),
            },
            update: {
              user_onboarding_hear_about: onboardDto.foundUsOn,
              user_onboarding_how_to_use: onboardDto.purpose,
              user_onboarding_what_to_expect: onboardDto.interests.join(","),
            },
          },
        },
      },
      select: {
        user_account_tables: {
          select: {
            user_account_account_id: true,
            user_account_provider_id: true,
          },
        },
      },
    });

    return user;
  }
}
