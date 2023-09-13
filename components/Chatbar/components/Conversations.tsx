import {Conversation} from '@/types/chat';

import {ConversationComponent} from './Conversation';
import styles from './conversations.module.scss'

interface Props {
	conversations: Conversation[];
}

/**
 * 左侧栏-聊天框列表组件
 * @param conversations
 * @constructor
 */
export const Conversations = ({conversations}: Props) => {
	return (
		<div className={styles['conversations']}>
			{conversations
				//过滤出没有folderId的对话
				.filter((conversation) => !conversation.folderId)
				.slice()
				.reverse()
				.map((conversation, index) => (
					<ConversationComponent key={index} conversation={conversation}/>
				))}
		</div>
	);
};
