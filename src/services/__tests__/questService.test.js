import {
  getActiveDailyQuest,
  getActiveWeeklyQuest,
  updateQuestProgress,
  getUserXP,
  getUserEP,
  awardXP,
  awardEP,
  getXPForNextLevel,
  getEPForNextLevel,
  getUserStamps,
  getUserAchievements,
  addStamp,
  addAchievement
} from '../questService';

// Mock supabase client
jest.mock('../../api/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn(),
    rpc: jest.fn()
  }
}));

import { supabase } from '../../api/supabaseClient';

describe('questService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // QUEST OPERATIONS
  // ============================================

  describe('getActiveDailyQuest', () => {
    const mockUser = { id: 'user123' };

    it('should return existing active quest', async () => {
      const mockQuest = {
        id: 'quest1',
        title: 'Scan 5 buildings',
        type: 'daily',
        quest_type: 'scan',
        target: 5
      };

      const mockProfile = {
        daily_quest_id: 'quest1',
        daily_quest_progress: 2,
        daily_quest_completed: false
      };

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
          .mockResolvedValueOnce({ data: mockProfile, error: null })
          .mockResolvedValueOnce({ data: mockQuest, error: null })
      });

      const result = await getActiveDailyQuest();

      expect(result).toEqual({
        ...mockQuest,
        progress: 2,
        completed: false
      });
    });

    it('should assign new quest if none assigned', async () => {
      const mockNewQuest = {
        id: 'quest2',
        title: 'Complete a walk',
        type: 'daily'
      };

      const mockProfile = {
        daily_quest_id: null,
        daily_quest_progress: 0,
        daily_quest_completed: false
      };

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const gteMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn()
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: mockNewQuest, error: null });

      const updateMock = jest.fn().mockReturnThis();
      const updateEqMock = jest.fn().mockResolvedValue({ data: null, error: null });

      supabase.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: selectMock,
            eq: jest.fn().mockReturnValue({
              single: singleMock
            }),
            update: jest.fn().mockReturnValue({
              eq: updateEqMock
            })
          };
        }
        if (table === 'quests') {
          return {
            select: selectMock,
            eq: eqMock,
            gte: gteMock,
            order: orderMock,
            limit: limitMock,
            single: singleMock
          };
        }
      });

      const result = await getActiveDailyQuest();

      expect(result).toEqual({
        ...mockNewQuest,
        progress: 0,
        completed: false
      });
    });

    it('should return null when no user logged in', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await getActiveDailyQuest();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error')
        })
      });

      const result = await getActiveDailyQuest();

      expect(result).toBeNull();
    });
  });

  describe('getActiveWeeklyQuest', () => {
    const mockUser = { id: 'user123' };

    it('should return existing active weekly quest', async () => {
      const mockQuest = {
        id: 'quest1',
        title: 'Scan 20 buildings',
        type: 'weekly'
      };

      const mockProfile = {
        weekly_quest_id: 'quest1',
        weekly_quest_progress: 10,
        weekly_quest_completed: false
      };

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
          .mockResolvedValueOnce({ data: mockProfile, error: null })
          .mockResolvedValueOnce({ data: mockQuest, error: null })
      });

      const result = await getActiveWeeklyQuest();

      expect(result).toEqual({
        ...mockQuest,
        progress: 10,
        completed: false
      });
    });

    it('should return null when no user logged in', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await getActiveWeeklyQuest();

      expect(result).toBeNull();
    });
  });

  describe('updateQuestProgress', () => {
    const mockUser = { id: 'user123' };

    it('should update quest progress successfully', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = await updateQuestProgress('daily', 1);

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('update_quest_progress', {
        p_user_id: 'user123',
        p_quest_type: 'daily',
        p_progress_increment: 1
      });
    });

    it('should handle custom increment', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.rpc.mockResolvedValue({ data: false, error: null });

      await updateQuestProgress('weekly', 5);

      expect(supabase.rpc).toHaveBeenCalledWith('update_quest_progress', {
        p_user_id: 'user123',
        p_quest_type: 'weekly',
        p_progress_increment: 5
      });
    });

    it('should return false on error', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('RPC error')
      });

      const result = await updateQuestProgress('daily', 1);

      expect(result).toBe(false);
    });

    it('should return false when no user logged in', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await updateQuestProgress('daily', 1);

      expect(result).toBe(false);
    });
  });

  // ============================================
  // XP OPERATIONS
  // ============================================

  describe('getUserXP', () => {
    const mockUser = { id: 'user123' };

    it('should return user XP data', async () => {
      const mockProfile = {
        xp: 500,
        level: 3,
        xp_spent: 100
      };

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
      });

      const result = await getUserXP();

      expect(result).toEqual({
        ep: 500,
        level: 3,
        epSpent: 100
      });
    });

    it('should return default values when no data', async () => {
      const mockProfile = {
        xp: null,
        level: null,
        xp_spent: null
      };

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
      });

      const result = await getUserXP();

      expect(result).toEqual({
        ep: 0,
        level: 1,
        epSpent: 0
      });
    });

    it('should return defaults on error', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error')
        })
      });

      const result = await getUserXP();

      expect(result).toEqual({
        ep: 0,
        level: 1,
        epSpent: 0
      });
    });
  });

  describe('getUserEP (backwards compatibility)', () => {
    it('should be the same as getUserXP', () => {
      expect(getUserEP).toBe(getUserXP);
    });
  });

  describe('awardXP', () => {
    const mockUser = { id: 'user123' };

    it('should award XP successfully', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await awardXP(50, 'quest_completion');

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('award_xp', {
        p_user_id: 'user123',
        p_amount: 50
      });
    });

    it('should update quest progress on building scan', async () => {
      const mockDailyQuest = {
        quest_type: 'scan',
        completed: false
      };

      const mockWeeklyQuest = {
        quest_type: 'scan',
        completed: false
      };

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.rpc.mockResolvedValue({ data: null, error: null });

      // Mock quest fetching
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn()
          .mockResolvedValueOnce({
            data: { daily_quest_id: 'q1', daily_quest_progress: 0, daily_quest_completed: false },
            error: null
          })
          .mockResolvedValueOnce({ data: mockDailyQuest, error: null })
          .mockResolvedValueOnce({
            data: { weekly_quest_id: 'q2', weekly_quest_progress: 0, weekly_quest_completed: false },
            error: null
          })
          .mockResolvedValueOnce({ data: mockWeeklyQuest, error: null })
      });

      const result = await awardXP(10, 'building_scan');

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('RPC error')
      });

      const result = await awardXP(50);

      expect(result).toBe(false);
    });

    it('should return false when no user logged in', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await awardXP(50);

      expect(result).toBe(false);
    });
  });

  describe('awardEP (backwards compatibility)', () => {
    it('should be the same as awardXP', () => {
      expect(awardEP).toBe(awardXP);
    });
  });

  describe('getXPForNextLevel', () => {
    it('should calculate XP for level 1 to 2', () => {
      // XP = (level ^ 2) * 100
      // For level 2: 1^2 * 100 = 100
      expect(getXPForNextLevel(1)).toBe(100);
    });

    it('should calculate XP for level 2 to 3', () => {
      // For level 3: 2^2 * 100 = 400
      expect(getXPForNextLevel(2)).toBe(400);
    });

    it('should calculate XP for level 5 to 6', () => {
      // For level 6: 5^2 * 100 = 2500
      expect(getXPForNextLevel(5)).toBe(2500);
    });

    it('should calculate XP for level 10 to 11', () => {
      // For level 11: 10^2 * 100 = 10000
      expect(getXPForNextLevel(10)).toBe(10000);
    });

    it('should handle level 0', () => {
      // 0^2 * 100 = 0
      expect(getXPForNextLevel(0)).toBe(0);
    });

    it('should return increasing values for increasing levels', () => {
      const xp1 = getXPForNextLevel(1);
      const xp2 = getXPForNextLevel(2);
      const xp3 = getXPForNextLevel(3);

      expect(xp2).toBeGreaterThan(xp1);
      expect(xp3).toBeGreaterThan(xp2);
    });

    it('should follow quadratic growth pattern', () => {
      // XP growth should be quadratic (exponentially increasing gaps)
      const xp1to2 = getXPForNextLevel(1);
      const xp2to3 = getXPForNextLevel(2);
      const xp3to4 = getXPForNextLevel(3);

      const gap1 = xp2to3 - xp1to2; // 400 - 100 = 300
      const gap2 = xp3to4 - xp2to3; // 900 - 400 = 500

      expect(gap2).toBeGreaterThan(gap1);
    });
  });

  describe('getEPForNextLevel (backwards compatibility)', () => {
    it('should be the same as getXPForNextLevel', () => {
      expect(getEPForNextLevel).toBe(getXPForNextLevel);
    });
  });

  // ============================================
  // STAMP & ACHIEVEMENT OPERATIONS
  // ============================================

  describe('getUserStamps', () => {
    const mockUser = { id: 'user123' };

    it('should return user stamps', async () => {
      const mockStamps = ['explorer', 'collector', 'master'];

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { stamps: mockStamps },
          error: null
        })
      });

      const result = await getUserStamps();

      expect(result).toEqual(mockStamps);
    });

    it('should return empty array when no stamps', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { stamps: null },
          error: null
        })
      });

      const result = await getUserStamps();

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error')
        })
      });

      const result = await getUserStamps();

      expect(result).toEqual([]);
    });
  });

  describe('getUserAchievements', () => {
    const mockUser = { id: 'user123' };

    it('should return user achievements', async () => {
      const mockAchievements = ['first_scan', 'first_walk', '100_buildings'];

      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { achievements: mockAchievements },
          error: null
        })
      });

      const result = await getUserAchievements();

      expect(result).toEqual(mockAchievements);
    });

    it('should return empty array when no achievements', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { achievements: null },
          error: null
        })
      });

      const result = await getUserAchievements();

      expect(result).toEqual([]);
    });
  });

  describe('addStamp', () => {
    const mockUser = { id: 'user123' };

    it('should add stamp successfully', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await addStamp('explorer');

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('add_stamp', {
        p_user_id: 'user123',
        p_stamp_name: 'explorer'
      });
    });

    it('should return false on error', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('RPC error')
      });

      const result = await addStamp('explorer');

      expect(result).toBe(false);
    });
  });

  describe('addAchievement', () => {
    const mockUser = { id: 'user123' };

    it('should add achievement successfully', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await addAchievement('first_scan');

      expect(result).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('add_achievement', {
        p_user_id: 'user123',
        p_achievement_name: 'first_scan'
      });
    });

    it('should return false on error', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      supabase.rpc.mockResolvedValue({
        data: null,
        error: new Error('RPC error')
      });

      const result = await addAchievement('first_scan');

      expect(result).toBe(false);
    });

    it('should return false when no user logged in', async () => {
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const result = await addAchievement('first_scan');

      expect(result).toBe(false);
    });
  });
});
