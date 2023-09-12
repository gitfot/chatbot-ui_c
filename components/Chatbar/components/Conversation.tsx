import {
	IconCheck,
	IconMessage,
	IconPencil,
	IconTrash,
	IconX,
} from '@tabler/icons-react';
import {
	DragEvent,
	KeyboardEvent,
	MouseEventHandler,
	useContext,
	useEffect,
	useState,
} from 'react';

import {Conversation} from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import SidebarActionButton from '@/components/Buttons/SidebarActionButton';
import ChatbarContext from '@/components/Chatbar/Chatbar.context';
import styles from './conversation.module.scss'

interface Props {
	conversation: Conversation;
}

/**
 * 聊天框组件
 * @param conversation
 * @constructor
 */
export const ConversationComponent = ({conversation}: Props) => {
	const {
		state: {selectedConversation, messageIsStreaming},
		handleSelectConversation,
		handleUpdateConversation,
	} = useContext(HomeContext);

	const {handleDeleteConversation} = useContext(ChatbarContext);

	const [isDeleting, setIsDeleting] = useState(false);
	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState('');

	const handleEnterDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			selectedConversation && handleRename(selectedConversation);
		}
	};

	/**
	 * 处理拖拽事件
	 * @param e
	 * @param conversation
	 */
	const handleDragStart = (
		e: DragEvent<HTMLButtonElement>,
		conversation: Conversation,
	) => {
		if (e.dataTransfer) {
			e.dataTransfer.setData('conversation', JSON.stringify(conversation));
		}
	};

	const handleRename = (conversation: Conversation) => {
		if (renameValue.trim().length > 0) {
			handleUpdateConversation(conversation, {
				key: 'name',
				value: renameValue,
			});
			setRenameValue('');
			setIsRenaming(false);
		}
	};

	const handleConfirm: MouseEventHandler<HTMLButtonElement> = (e) => {
		e.stopPropagation();
		if (isDeleting) {
			handleDeleteConversation(conversation);
		} else if (isRenaming) {
			handleRename(conversation);
		}
		setIsDeleting(false);
		setIsRenaming(false);
	};

	const handleCancel: MouseEventHandler<HTMLButtonElement> = (e) => {
		e.stopPropagation();
		setIsDeleting(false);
		setIsRenaming(false);
	};

	const handleOpenRenameModal: MouseEventHandler<HTMLButtonElement> = (e) => {
		e.stopPropagation();
		setIsRenaming(true);
		selectedConversation && setRenameValue(selectedConversation.name);
	};
	const handleOpenDeleteModal: MouseEventHandler<HTMLButtonElement> = (e) => {
		e.stopPropagation();
		setIsDeleting(true);
	};

	useEffect(() => {
		if (isRenaming) {
			setIsDeleting(false);
		} else if (isDeleting) {
			setIsRenaming(false);
		}
	}, [isRenaming, isDeleting]);

	return (
		<div className={styles.conversationItem}>
			{isRenaming && selectedConversation?.id === conversation.id ? (
				<div className={styles.renameItem}>
					<IconMessage size={18}/>
					<input
						className={styles.renameItemInput}
						type="text"
						value={renameValue}
						onChange={(e) => setRenameValue(e.target.value)}
						onKeyDown={handleEnterDown}
						autoFocus
					/>
				</div>
			) : (

				<button
					className={`${styles.normalItem} ${selectedConversation?.id === conversation.id ?
						styles.normalItemSelected : ''}
						${messageIsStreaming ? styles.normalItemDisabled : ''}
					`}

					onClick={() => handleSelectConversation(conversation)}
					disabled={messageIsStreaming}
					draggable="true"
					onDragStart={(e) => handleDragStart(e, conversation)}
				>
					<IconMessage size={18}/>
					<div
						className={`${styles.itemMessage} ${
							selectedConversation?.id === conversation.id ? 'pr-12' : 'pr-1'
						}`}
					>
						{conversation.name}
					</div>
				</button>
			)}

			{(isDeleting || isRenaming) &&
				selectedConversation?.id === conversation.id && (
					<div className="absolute right-1 z-10 flex text-gray-300">
						<SidebarActionButton handleClick={handleConfirm}>
							<IconCheck size={18}/>
						</SidebarActionButton>
						<SidebarActionButton handleClick={handleCancel}>
							<IconX size={18}/>
						</SidebarActionButton>
					</div>
				)}

			{selectedConversation?.id === conversation.id &&
				!isDeleting &&
				!isRenaming && (
					<div className="absolute right-1 z-10 flex text-gray-300">
						<SidebarActionButton handleClick={handleOpenRenameModal}>
							<IconPencil size={18}/>
						</SidebarActionButton>
						<SidebarActionButton handleClick={handleOpenDeleteModal}>
							<IconTrash size={18}/>
						</SidebarActionButton>
					</div>
				)}
		</div>
	);
};
