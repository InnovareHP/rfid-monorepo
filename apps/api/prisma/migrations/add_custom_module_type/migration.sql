-- Custom modules share one enum value; moduleId carries which module it is.
ALTER TYPE board_schema."ModuleType" ADD VALUE IF NOT EXISTS 'CUSTOM';
