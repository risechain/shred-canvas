import { apolloClient } from "@/lib/apollo-client";
import { GET_TOPIC_MESSAGES, GET_TOPICS } from "@/lib/graphql/queries";
import { ApolloClient, HttpLink, useQuery } from "@apollo/client";
import { useMemo } from "react";
import { useWallet } from "../contract/useWallet";

export type Message = {
  totalCount: number;
  items: {
    message: string;
    msgId: number;
    topic: string;
    user: string;
    userId: string;
    timestamp: number;
  }[];
};

export type RateItem = {
  rating: number;
  topicId: number;
  user: string;
};

export type Rating = {
  totalCount: number;
  items: RateItem[];
};

export type Topic = {
  topics: {
    totalCount: number;
    items: {
      topic: string;
      topicId: number;
      messages: Message;
      userRatings: Rating;
    }[];
  };
};

export type UserRating = {
  filteredRatings: null | RateItem[];
  totalUserRating: string;
  averageRating: string;
  topicId?: number;
};

export type TopicProps = {
  name: string;
  pollInterval?: number;
};

export type UserTopicRatingProps = {
  topicId: number;
};

const client = new ApolloClient({
  ...apolloClient,
  link: new HttpLink({ uri: process.env.NEXT_PUBLIC_KARMA_GRAPHQL_URL }),
});

export function useTopics() {
  const { data } = useQuery<Topic>(GET_TOPICS, {
    pollInterval: 2000, // lower down
    client,
  });

  function getTopic(name: string) {
    const topics = data?.topics.items;

    const topic = topics?.find((topic) => {
      return topic.topic === name;
    });

    return topic;
  }

  function getUserRating(name: string): UserRating {
    const topic = getTopic(name);

    if (!topic)
      return {
        filteredRatings: null,
        totalUserRating: "0",
        averageRating: "0",
      };

    const ratings = topic.userRatings.items;

    const filteredRatings =
      Array.from(
        new Map(ratings.map((rating) => [rating.user, rating])).values()
      ) ?? [];

    const averageRating =
      filteredRatings.length !== 0
        ? (
            filteredRatings.reduce((sum, r) => sum + r.rating, 0) /
            filteredRatings.length
          ).toFixed(1)
        : "0";

    const totalUserRating = String(filteredRatings.length);

    return {
      filteredRatings,
      totalUserRating,
      averageRating,
    };
  }

  return { data: data?.topics, getUserRating, getTopic };
}

export function useTopic(props: TopicProps) {
  const { name, pollInterval = 30000 } = props;
  const { account } = useWallet();

  const { data, loading, error } = useQuery<Topic>(GET_TOPIC_MESSAGES, {
    variables: {
      topic: name,
      messageLimit: 20,
    },
    client,
    pollInterval, // lower down
  });

  const topicUnsorted = useMemo(() => {
    if (!data?.topics?.items || data?.topics?.items.length === 0) return null;
    return data?.topics?.items[0];
  }, [data?.topics]);

  const topic = useMemo(() => {
    if (!topicUnsorted) return null;
    return {
      ...topicUnsorted,
      messages: {
        ...topicUnsorted.messages,
        items: [...topicUnsorted.messages.items].sort((a, b) => a.timestamp - b.timestamp),
      },
    };
  }, [topicUnsorted]);

  const uniqueMessages = useMemo(() => {
    if (!topic) return [];

    const msgs = [...topic.messages?.items];
    const uniqueMessages =
      Array.from(new Map(msgs.map((msg) => [msg.userId, msg])).values()) ?? [];

    return uniqueMessages;
  }, [topic]);

  const messages = useMemo(() => {
    if (!topic) return [];

    // Messages come from GraphQL in descending order (newest first)
    // We need to sort them by timestamp ascending (oldest first)
    return [...topic.messages.items];
  }, [topic]);

  const ratings = useMemo(() => {
    if (!topic) return [];

    const ratings = topic.userRatings.items;

    const filteredRatings =
      Array.from(
        new Map(ratings.map((rating) => [rating.user, rating])).values()
      ) ?? [];

    return filteredRatings;
  }, [topic]);

  const averageRating = useMemo(() => {
    return ratings.length !== 0
      ? (
          ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        ).toFixed(1)
      : "0";
  }, [ratings]);

  const totalUserRating = String(ratings.length);

  const userRating = useMemo(() => {
    return ratings.find((rating) => {
      return rating.user.toLowerCase() === account?.address?.toLowerCase();
    });
  }, [account?.address, ratings]);
  

  return {
    data: topic,
    ratings,
    userRating,
    averageRating,
    totalUserRating,
    messages,
    uniqueMessages,
    uniqueMessagesCount: uniqueMessages.length,
    loading,
    error,
  };
}