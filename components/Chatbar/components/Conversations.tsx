import {Conversation as ConversationType} from '@/types/chat';

import {Conversation} from './Conversation';
import styles from './conversations.module.scss'
import {OnDragEndResponder} from "@hello-pangea/dnd";
import {useConversationStore} from "@/pages/store/ConversationStore";

interface Props {
	conversations: ConversationType[];
}

/**
 * 左侧栏-聊天框列表组件
 * @param conversations
 * @constructor
 */
export const Conversations = ({conversations}: Props) => {
	const [sessions, selectedIndex, selectSession, moveSession] = useConversationStore(
		(state) => [
			state.sessions,
			state.currentSessionIndex,
			state.selectSession,
			state.moveSession,
		],
	);

	//拖动会话窗格
	const onDragEnd: OnDragEndResponder = (result) => {
		const {destination, source} = result;
		if (!destination) {
			return;
		}
		if (
			destination.droppableId === source.droppableId &&
			destination.index === source.index
		) {
			return;
		}
		moveSession(source.index, destination.index);
	};

	return (
		<div className={styles['conversations']}>
			{conversations
				//过滤出没有folderId的对话
				.filter((conversation) => !conversation.folderId)
				.slice()
				.reverse()
				.map((conversation, index) => (
					<Conversation key={index} conversation={conversation}/>
				))}
		</div>
	);
};
