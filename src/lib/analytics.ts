import { TestSession, TopicStats } from '../types';

export interface TopicAnalytics {
  topic: string;
  totalQuestions: number;
  accuracy: number; // 0 to 100
  averageTime: number; // in seconds
  trend: 'up' | 'down' | 'flat';
  status: 'mastered' | 'review' | 'critical';
}

export function analyzeTopics(sessions: TestSession[]): TopicAnalytics[] {
  const topicMap = new Map<string, {
    totalQuestions: number;
    correctCount: number;
    totalTime: number;
    recentAccuracies: number[];
  }>();

  // Sort sessions by date ascending (oldest first)
  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  );

  for (const session of sortedSessions) {
    if (!session.topicStats) continue;

    for (const stat of session.topicStats) {
      if (!topicMap.has(stat.topic)) {
        topicMap.set(stat.topic, {
          totalQuestions: 0,
          correctCount: 0,
          totalTime: 0,
          recentAccuracies: []
        });
      }

      const data = topicMap.get(stat.topic)!;
      data.totalQuestions += stat.totalQuestions;
      data.correctCount += stat.correctCount;
      data.totalTime += (stat.averageTime * stat.totalQuestions);
      
      const sessionAccuracy = stat.totalQuestions > 0 
        ? (stat.correctCount / stat.totalQuestions) * 100 
        : 0;
      
      data.recentAccuracies.push(sessionAccuracy);
      // Keep only last 3 for trend
      if (data.recentAccuracies.length > 3) {
        data.recentAccuracies.shift();
      }
    }
  }

  const results: TopicAnalytics[] = [];

  for (const [topic, data] of topicMap.entries()) {
    if (data.totalQuestions === 0) continue;

    const accuracy = (data.correctCount / data.totalQuestions) * 100;
    const averageTime = data.totalTime / data.totalQuestions;

    let trend: 'up' | 'down' | 'flat' = 'flat';
    if (data.recentAccuracies.length >= 2) {
      const first = data.recentAccuracies[0];
      const last = data.recentAccuracies[data.recentAccuracies.length - 1];
      if (last > first + 5) trend = 'up';
      else if (last < first - 5) trend = 'down';
    }

    let status: 'mastered' | 'review' | 'critical' = 'review';
    if (accuracy >= 80 && averageTime <= 15) {
      status = 'mastered';
    } else if (accuracy < 50 || averageTime > 30) {
      status = 'critical';
    }

    results.push({
      topic,
      totalQuestions: data.totalQuestions,
      accuracy,
      averageTime,
      trend,
      status
    });
  }

  // Sort by status (critical first), then accuracy ascending
  return results.sort((a, b) => {
    const statusWeight = { critical: 0, review: 1, mastered: 2 };
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[a.status] - statusWeight[b.status];
    }
    return a.accuracy - b.accuracy;
  });
}
