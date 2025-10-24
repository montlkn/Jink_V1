import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { getUserAestheticProfile } from '../../api/quizApi';
import { supabase } from '../../api/supabaseClient';
import ArchetypeOrb from '../../components/ArchetypeOrb';
import AuraBreakdownModal from '../../components/modals/AuraBreakdownModal';
import XPDetailModal from '../../components/modals/XPDetailModal';
import XPGlassBadge from '../../components/passport/XPGlassBadge';
import QuestCard from '../../components/quests/QuestCard';
import QuestDetailModal from '../../components/quests/QuestDetailModal';
import { getActiveDailyQuest, getActiveWeeklyQuest, getUserXP, getXPForNextLevel } from '../../services/questService';
import { getRecentTasteSummary } from '../../services/recentTasteSummaryService';
import { useOrbTransition } from '../../state/orbTransitionContext';
import { getTimeUntilMidnight, getTimeUntilMonday } from '../../utils/questTimers';
import { extractTopArchetypesFromScores } from '../../utils/archetypeColorBlend';

const ORB_SIZE = 360;

export default function HomeScreen({ navigation }) {
  const [archetypeData, setArchetypeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auraVisible, setAuraVisible] = useState(false);
  const [xpModalVisible, setXpModalVisible] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dailyTimeRemaining, setDailyTimeRemaining] = useState('');
  const [weeklyTimeRemaining, setWeeklyTimeRemaining] = useState('');
  const [dailyQuest, setDailyQuest] = useState(null);
  const [weeklyQuest, setWeeklyQuest] = useState(null);
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [xpForNextLevel, setXpForNextLevel] = useState(100);
  const [tasteSummary, setTasteSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  const {
    registerHomeOrbLayout,
    setOrbData,
    transitionProgress,
    isTransitioning,
  } = useOrbTransition();
  const orbContainerRef = useRef(null);

  // Load aesthetic profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Get session directly from Supabase
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          console.error('No session found');
          setLoading(false);
          return;
        }

        const profile = await getUserAestheticProfile(session.user.id);
        if (profile?.archetype_scores) {
          const sorted = extractTopArchetypesFromScores(profile.archetype_scores);
          setArchetypeData(sorted);
        }
      } catch (err) {
        console.error('Error fetching archetypes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (archetypeData.length) {
      setOrbData(archetypeData);

      const hydrateSummary = async () => {
        try {
          if (isMounted) {
            setSummaryLoading(true);
            setTasteSummary("");
          }

          const { data: { session } } = await supabase.auth.getSession();
          if (!session || !isMounted) {
            return;
          }

          const summary = await getRecentTasteSummary({
            userId: session.user.id,
            archetypes: archetypeData,
          });

          if (isMounted) {
            setTasteSummary(summary?.text || "");
          }
        } catch (error) {
          console.error("Error building taste summary:", error);
          if (isMounted) {
            setTasteSummary("");
          }
        } finally {
          if (isMounted) {
            setSummaryLoading(false);
          }
        }
      };

      hydrateSummary();
    } else {
      setTasteSummary("");
      setSummaryLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [archetypeData, setOrbData]);

  // Load quests from Supabase
  useEffect(() => {
    loadQuests();
  }, []);

  const loadQuests = async () => {
    try {
      const [daily, weekly, epData] = await Promise.all([
        getActiveDailyQuest(),
        getActiveWeeklyQuest(),
        getUserXP()
      ]);

      // Set XP data
      setUserXP(epData.ep || epData.xp || 0);
      setUserLevel(epData.level || 1);
      setXpForNextLevel(getXPForNextLevel(epData.level || 1));

      if (daily) {
        setDailyQuest({
          type: 'daily',
          questType: daily.quest_type,
          title: daily.title,
          description: daily.description,
          xpReward: daily.xp_reward,
          additionalRewards: (daily.rewards?.stamps || []).map(stamp => ({
            type: 'stamp',
            icon: 'bookmark',
            label: stamp
          })).concat((daily.rewards?.achievements || []).map(achievement => ({
            type: 'achievement',
            icon: 'ribbon',
            label: achievement
          }))),
          progress: daily.progress || 0,
          total: daily.target_count,
          completed: daily.completed || false
        });
      }

      if (weekly) {
        setWeeklyQuest({
          type: 'weekly',
          questType: weekly.quest_type,
          title: weekly.title,
          description: weekly.description,
          xpReward: weekly.xp_reward,
          additionalRewards: (weekly.rewards?.stamps || []).map(stamp => ({
            type: 'stamp',
            icon: 'bookmark',
            label: stamp
          })).concat((weekly.rewards?.achievements || []).map(achievement => ({
            type: 'achievement',
            icon: 'ribbon',
            label: achievement
          }))),
          progress: weekly.progress || 0,
          total: weekly.target_count,
          completed: weekly.completed || false
        });
      }
    } catch (error) {
      console.error('Error loading quests:', error);
    }
  };

  // Update timers
  useEffect(() => {
    const updateTimers = () => {
      setDailyTimeRemaining(getTimeUntilMidnight().formatted);
      setWeeklyTimeRemaining(getTimeUntilMonday().formatted);
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleOrbPress = () => setAuraVisible(true);

  const handleQuestPress = (quest) => {
    setSelectedQuest(quest);
    setModalVisible(true);
  };

  const handleStartQuest = (screen) => {
    navigation.navigate(screen);
  };

  const contentFade = transitionProgress.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [1, 0.35, 0],
    extrapolate: 'clamp',
  });

  const orbOpacity = isTransitioning ? 0 : 1;

  const handleOrbLayout = () => {
    if (!orbContainerRef.current) return;
    const node =
      typeof orbContainerRef.current.measureInWindow === 'function'
        ? orbContainerRef.current
        : orbContainerRef.current.getNode?.();
    if (!node || typeof node.measureInWindow !== 'function') {
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      registerHomeOrbLayout({ x, y, width, height });
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#999" />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* XP Glass Badge - Top Left with gyro and rainbow highlights */}
        <Animated.View style={[styles.xpBadgeContainer, { opacity: contentFade }]}>
          <XPGlassBadge
            currentXP={userXP}
            level={userLevel}
            xpForNextLevel={xpForNextLevel}
            onPress={() => setXpModalVisible(true)}
          />
        </Animated.View>
        <Animated.View
          ref={orbContainerRef}
          onLayout={handleOrbLayout}
          style={[styles.orbSection, { opacity: orbOpacity }]}
        >
          <View style={styles.orbWrapper}>
            <ArchetypeOrb
              archetypeData={archetypeData}
              xpLevel={userLevel}
              xpProgress={userXP / xpForNextLevel}
              size={ORB_SIZE}
              onPress={handleOrbPress}
              interactive={true}
              lod="standard"
            />
          </View>
        </Animated.View>
        {(summaryLoading || tasteSummary) && (
          <Animated.View style={[styles.summaryContainer, { opacity: contentFade }]}>
            {summaryLoading ? (
              <Text style={styles.summaryLoadingText}>Calibrating your recent focus…</Text>
            ) : (
              <Text style={styles.summaryText}>{tasteSummary}</Text>
            )}
          </Animated.View>
        )}

        <Animated.View style={{ opacity: contentFade }}>
          {/* Daily Quest Section */}
          {dailyQuest && (
            <View style={styles.section}>
              <QuestCard
                type="daily"
                title={dailyQuest.title}
                description={dailyQuest.description}
                epReward={dailyQuest.xpReward}
                xpReward={dailyQuest.xpReward}
                additionalRewards={dailyQuest.additionalRewards}
                progress={dailyQuest.progress}
                total={dailyQuest.total}
                completed={dailyQuest.completed}
                onPress={() => handleQuestPress(dailyQuest)}
              />
            </View>
          )}

          {/* Weekly Quest Section */}
          {weeklyQuest && (
            <View style={styles.section}>
              <QuestCard
                type="weekly"
                title={weeklyQuest.title}
                description={weeklyQuest.description}
                epReward={weeklyQuest.xpReward}
                xpReward={weeklyQuest.xpReward}
                additionalRewards={weeklyQuest.additionalRewards}
                progress={weeklyQuest.progress}
                total={weeklyQuest.total}
                completed={weeklyQuest.completed}
                onPress={() => handleQuestPress(weeklyQuest)}
              />
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <AuraBreakdownModal
        visible={auraVisible}
        onClose={() => setAuraVisible(false)}
        segments={archetypeData}
      />

      {/* XP Detail Modal */}
      <XPDetailModal
        visible={xpModalVisible}
        onClose={() => setXpModalVisible(false)}
        currentXP={userXP}
        level={userLevel}
        xpForNextLevel={xpForNextLevel}
      />

      {/* Quest Detail Modal */}
      <QuestDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        quest={selectedQuest}
        onStartQuest={handleStartQuest}
        timeRemaining={selectedQuest?.type === 'daily' ? dailyTimeRemaining : weeklyTimeRemaining}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  scrollContent: { paddingBottom: 100, paddingTop: 60 },
  xpBadgeContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  orbSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 24,
  },
  orbWrapper: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(8, 12, 20, 0)',
  },
  orbGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  orbLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    marginTop: 12,
  },
  summaryContainer: {
    marginTop: 24,
    marginHorizontal: 32,
    maxWidth: 340,
    alignSelf: 'center',
  },
  summaryText: {
    fontSize: 17,
    lineHeight: 24,
    color: '#1A1A1A',
    textAlign: 'center',
    fontWeight: '500',
  },
  summaryLoadingText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  section: {
    marginHorizontal: 20,
    marginTop: 12,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
