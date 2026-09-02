import * as React from "react";

// Seeded once by _team.tsx so a write control anywhere in the tree can ask
// without every feature threading the organization id down to it.
export const WriteAccessContext = React.createContext(true);

export const useCanWrite = () => React.useContext(WriteAccessContext);
