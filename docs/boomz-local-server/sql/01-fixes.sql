-- ============================================================================
-- Boomz / DDTank 3.0 local-server database fixes
-- Target: SQL Server 2019 (Docker), databases restored from the leaked dump:
--   Db_Tank, Db_Count, Db_User, Db_Tank_Record (names may vary by dump)
-- Run against the SQL Server instance after restoring the .bak/.mdf dumps.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Edition mismatch
-- The Center server compares GameProperties.EDITION (hard-coded "21000" in the
-- binaries) against Server_Config.Edition. A fresh dump often ships a random
-- value (e.g. 5498628) which makes every login fail with "Edition:xxxx: False".
-- ----------------------------------------------------------------------------
UPDATE Db_Tank.dbo.Server_Config SET Value = '21000' WHERE Name = 'Edition';

-- ----------------------------------------------------------------------------
-- 2. Road (game world) server registration
-- WorldMgr.Init() calls ServiceBussiness.GetServiceSingle(ServerID) where the
-- Road server's ServerID = 2 (see Road.Service.exe.config). If Server_List has
-- no row with ID = 2 the call returns null and startup stops at
-- "WorldMgr Init: False". Register the local Road server here.
-- (State=1 online, Total=8000 = MaxClientCount, IP/Port match the config.)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Db_Tank.dbo.Server_List WHERE ID = 2)
BEGIN
  INSERT INTO Db_Tank.dbo.Server_List
    (ID, Name, IP, Port, State, Online, Total, Room, Remark, RSA,
     MustLevel, LowestLevel, NewerServer)
  VALUES
    (2, N'Local Road', N'127.0.0.1', 9210, 1, 0, 8000, 0, N'', NULL,
     0, 0, 0);
END

-- ----------------------------------------------------------------------------
-- 3. Maps referenced by the DB but missing on disk
-- MapMgr.Init() iterates Game_Map and requires BOTH map/<id>/fore.map and
-- map/<id>/dead.map to exist on disk. The dump references ~248 maps but only
-- ~113 map folders ship with the files. Setting PosX = NULL on a map row makes
-- MapMgr skip it instead of aborting. Adjust the id list to match the maps you
-- actually have files for (see scripts/list-missing-maps.sh in the docs).
--
-- Example (ids without map files in this environment):
-- UPDATE Db_Tank.dbo.Game_Map SET PosX = NULL
--   WHERE ID IN (/* ids whose map/<id>/ folder is missing fore.map or dead.map */);
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- Verification
-- ----------------------------------------------------------------------------
SELECT Name, Value FROM Db_Tank.dbo.Server_Config WHERE Name = 'Edition';
SELECT ID, Name, IP, Port, State FROM Db_Tank.dbo.Server_List ORDER BY ID;
