import {create} from "zustand";
import {persist} from "zustand/middleware";
import {ModelType} from "@/pages/store/config";
import {nanoid} from "nanoid";
import Locale, { getLang } from "../locales";
import {showToast} from "@/pages/components/ui-lib";
import {ROLES, StoreKey} from "@/pages/constant";

export interface RequestMessage {
	role: (typeof ROLES)[number];
	content: string;
}

export interface ConversationSession {
	id: string;
	topic: string;
	memoryPrompt: string;
	messages: ConversationMessage[];
	stat: ConversationStat;
	lastUpdate: number;
	lastSummarizeIndex: number;
	clearContextIndex?: number;
}

export interface ConversationStat {
	tokenCount: number;
	wordCount: number;
	charCount: number;
}

/**
 * 声明一个消息结构类型
 * 注意：RequestMessage是请求openai接口所需要的结构
 */
export type ConversationMessage = RequestMessage & {
	date: string;
	streaming?: boolean;
	isError?: boolean;
	id: string;
	model?: ModelType;
};

interface ConversationStore {
	sessions: ConversationSession[];
	currentSessionIndex: number;
	clearSessions: () => void;
	moveSession: (from: number, to: number) => void;
	selectSession: (index: number) => void;
	newSession: () => void;
	deleteSession: (index: number) => void;
	currentSession: () => ConversationSession;
	nextSession: (delta: number) => void;
	onNewMessage: (message: ConversationMessage) => void;
	updateCurrentSession: (updater: (session: ConversationSession) => void) => void;
	updateMessage: (
		sessionIndex: number,
		messageIndex: number,
		updater: (message?: ConversationMessage) => void,
	) => void;
	resetSession: () => void;
	getMemoryPrompt: () => ConversationMessage;

	clearAllData: () => void;
}

export const DEFAULT_TOPIC = Locale.Store.DefaultTopic;

/**
 * 创建一个默认会话窗口
 */
function createEmptySession(): ConversationSession {
	return {
		id: nanoid(),
		topic: DEFAULT_TOPIC,
		memoryPrompt: "",
		messages: [],
		stat: {
			tokenCount: 0,
			wordCount: 0,
			charCount: 0,
		},
		lastUpdate: Date.now(),
		lastSummarizeIndex: 0,
	};
}

/**
 * 对话窗口store
 */
export const useConversationStore = create<ConversationStore>()(
	persist(
		(set, get) => ({
			sessions: [createEmptySession()],
			currentSessionIndex: 0,

			clearSessions() {
				set(() => ({
					sessions: [createEmptySession()],
					currentSessionIndex: 0,
				}));
			},

			selectSession(index: number) {
				set({
					currentSessionIndex: index,
				});
			},

			//移动会话窗口
			moveSession(from: number, to: number) {
				set((state) => {
					const { sessions, currentSessionIndex: oldIndex } = state;

					// move the session
					const newSessions = [...sessions];
					const session = newSessions[from];
					newSessions.splice(from, 1);
					newSessions.splice(to, 0, session);

					// modify current session id
					let newIndex = oldIndex === from ? to : oldIndex;
					if (oldIndex > from && oldIndex <= to) {
						newIndex -= 1;
					} else if (oldIndex < from && oldIndex >= to) {
						newIndex += 1;
					}

					return {
						currentSessionIndex: newIndex,
						sessions: newSessions,
					};
				});
			},

			//创建一个对话窗口
			newSession() {
				const session = createEmptySession();
				set((state) => ({
					currentSessionIndex: 0,
					sessions: [session].concat(state.sessions),
				}));
			},

			nextSession(delta) {
				const n = get().sessions.length;
				const limit = (x: number) => (x + n) % n;
				const i = get().currentSessionIndex;
				get().selectSession(limit(i + delta));
			},

			//删除一个对话窗口
			deleteSession(index) {
				const deletingLastSession = get().sessions.length === 1;
				const deletedSession = get().sessions.at(index);

				if (!deletedSession) return;

				//将sessions复制到一个新数组，在新数组中删除选择的对话
				const sessions = get().sessions.slice();
				sessions.splice(index, 1);

				const currentIndex = get().currentSessionIndex;
				//获取删除会话的后下一个索引的位置
				let nextIndex = Math.min(
					//Number()函数可以将布尔值true转换为1，将布尔值false转换为0
					currentIndex - Number(index < currentIndex),
					sessions.length - 1,
				);
				//当仅有一个会话时，删除后重新创建一个默认对话
				if (deletingLastSession) {
					nextIndex = 0;
					sessions.push(createEmptySession());
				}

				// 备份消息窗口状态，用于撤销上一步删除操作
				const restoreState = {
					currentSessionIndex: get().currentSessionIndex,
					sessions: get().sessions.slice(),
				};

				set(() => ({
					currentSessionIndex: nextIndex,
					sessions,
				}));
				//底部弹出框
				showToast(
					Locale.Home.DeleteToast,
					{
						text: Locale.Home.Revert,
						//撤销删除操作
						onClick() {
							set(() => restoreState);
						},
					},
					5000,
				);
			},

			//获取当前会话窗口
			currentSession() {
				let index = get().currentSessionIndex;
				const sessions = get().sessions;

				if (index < 0 || index >= sessions.length) {
					index = Math.min(sessions.length - 1, Math.max(0, index));
					set(() => ({ currentSessionIndex: index }));
				}

				const session = sessions[index];
				return session;
			},

			//发送新消息时更新session信息
			onNewMessage() {
				get().updateCurrentSession((session) => {
					session.messages = session.messages.concat(); //数组拷贝
					session.lastUpdate = Date.now();
				});
			},

			//获取历史聊天总结，作为前情提要
			getMemoryPrompt() {
				const session = get().currentSession();
				return {
					role: "system",
					content:
						session.memoryPrompt.length > 0
							? Locale.Store.Prompt.History(session.memoryPrompt)
							: "",
					date: "",
				} as ConversationMessage;
			},

			//更新消息
			updateMessage(
				sessionIndex: number,
				messageIndex: number,
				updater: (message?: ConversationMessage) => void,
			) {
				const sessions = get().sessions;
				const session = sessions.at(sessionIndex);
				const messages = session?.messages;
				updater(messages?.at(messageIndex));
				set(() => ({ sessions }));
			},

			resetSession() {
				get().updateCurrentSession((session) => {
					session.messages = [];
					session.memoryPrompt = "";
				});
			},

			//对当前session进行修改操作
			updateCurrentSession(updater) {
				const sessions = get().sessions;
				const index = get().currentSessionIndex;
				updater(sessions[index]);
				set(() => ({ sessions }));
			},

			clearAllData() {
				localStorage.clear();
				location.reload();
			},
		}),
		{
			name: StoreKey.Chat,
		},
	),
);
