declare global {
  interface Session {
    memberRole: string;
    activeOrganizationId: string;
  }
  interface Member extends Member {
    memberRole: string;
  }
}

export {};
