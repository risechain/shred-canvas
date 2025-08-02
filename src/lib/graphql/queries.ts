import { gql } from "@apollo/client";

export const GET_TOPICS = gql`
  query GetTopics {
    topics {
      totalCount
      items {
        topic
        topicId
        messages {
          totalCount
          items {
            message
            msgId
            topic
            user
            userId
            timestamp
          }
        }
        userRatings {
          totalCount
          items {
            rating
            topicId
            user
          }
        }
      }
    }
  }
`;

export const GET_TOPIC_MESSAGES = gql`
  query GetTopicMessages($topic: String!, $messageLimit: Int = 20) {
    topics(where: { topic: $topic }) {
      totalCount
      items {
        topic
        topicId
        messages(orderBy: "timestamp", orderDirection: "desc", limit: $messageLimit) {
          totalCount
          items {
            message
            msgId
            topic
            user
            userId
            timestamp
          }
        }
        userRatings {
          totalCount
          items {
            rating
            topicId
            user
          }
        }
      }
    }
  }
`;