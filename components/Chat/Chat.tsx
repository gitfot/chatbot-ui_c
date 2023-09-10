import {IconClearAll, IconSettings} from '@tabler/icons-react';
import {
	MutableRefObject,
	memo,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import toast from 'react-hot-toast';

import {useTranslation} from 'next-i18next';

import {getEndpoint} from '@/utils/app/api';
import {
	saveConversation,
	saveConversations,
	updateConversation,
} from '@/utils/app/conversation';
import {throttle} from '@/utils/data/throttle';

import {ChatBody, Conversation, Message} from '@/types/chat';
import {Plugin} from '@/types/plugin';

import HomeContext from '@/pages/api/home/home.context';

import Spinner from '../Spinner';
import {ChatInput} from './ChatInput';
import {ChatLoader} from './ChatLoader';
import {ErrorMessageDiv} from './ErrorMessageDiv';
import {ModelSelect} from './ModelSelect';
import {SystemPrompt} from './SystemPrompt';
import {TemperatureSlider} from './Temperature';
import {MemoizedChatMessage} from './MemoizedChatMessage';

interface Props {
	stopConversationRef: MutableRefObject<boolean>;
}

//使用memo可以保证props变化时才会重新渲染包装的组件
export const Chat = memo(({stopConversationRef}: Props) => {
	const {t} = useTranslation('chat');

	const {
		state: {
			selectedConversation, //目标对话框
			conversations,
			models,
			apiKey,
			pluginKeys,
			serverSideApiKeyIsSet,
			messageIsStreaming,
			modelError,
			loading,
			prompts,
		},
		handleUpdateConversation,
		dispatch: homeDispatch,
	} = useContext(HomeContext); //对话框上下文

	const [currentMessage, setCurrentMessage] = useState<Message>();
	const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
	const [showSettings, setShowSettings] = useState<boolean>(false);
	const [showScrollDownButton, setShowScrollDownButton] =
		useState<boolean>(false);

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const chatContainerRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	/**
	 * 消息发送方法
	 */
	const handleSend = useCallback(
		async (message: Message, deleteCount = 0, plugin: Plugin | null = null) => {
			if (selectedConversation) {
				let updatedConversation: Conversation;
				//删除指定条数的消息(控制发送的历史消息数)
				if (deleteCount) {
					//获取当前对话框内的全部消息
					const updatedMessages = [...selectedConversation.messages];
					for (let i = 0; i < deleteCount; i++) {
						updatedMessages.pop();
					}
					updatedConversation = {
						...selectedConversation,
						messages: [...updatedMessages, message],
					};
				//插入新的消息
				} else {
					updatedConversation = {
						...selectedConversation,
						messages: [...selectedConversation.messages, message],
					};
				}
				//更新selectedConversation字段
				homeDispatch({
					field: 'selectedConversation',
					value: updatedConversation,
				});
				homeDispatch({field: 'loading', value: true});
				homeDispatch({field: 'messageIsStreaming', value: true});
				//发送的消息体
				const chatBody: ChatBody = {
					model: updatedConversation.model,
					messages: updatedConversation.messages,
					key: apiKey,
					prompt: updatedConversation.prompt,
					temperature: updatedConversation.temperature,
				};
				//获取send url
				const endpoint = getEndpoint(plugin);
				let body;
				if (!plugin) {
					body = JSON.stringify(chatBody);
				} else {
					body = JSON.stringify({
						...chatBody,
						googleAPIKey: pluginKeys
							.find((key) => key.pluginId === 'google-search')
							?.requiredKeys.find((key) => key.key === 'GOOGLE_API_KEY')?.value,
						googleCSEId: pluginKeys
							.find((key) => key.pluginId === 'google-search')
							?.requiredKeys.find((key) => key.key === 'GOOGLE_CSE_ID')?.value,
					});
				}
				const controller = new AbortController();
				const response = await fetch(endpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					signal: controller.signal,
					body,
				});
				//如果响应失败
				if (!response.ok) {
					homeDispatch({field: 'loading', value: false});
					homeDispatch({field: 'messageIsStreaming', value: false});
					toast.error(response.statusText);
					return;
				}
				//如果响应数据为空
				const data = response.body;
				if (!data) {
					homeDispatch({field: 'loading', value: false});
					homeDispatch({field: 'messageIsStreaming', value: false});
					return;
				}
				if (!plugin) {
					// 如果messages条数为1
					if (updatedConversation.messages.length === 1) {
						const {content} = message;
						//截取30以内字符作为本次对话的名称
						const customName =
							content.length > 30 ? content.substring(0, 30) + '...' : content;
						updatedConversation = {
							...updatedConversation,
							name: customName,
						};
					}
					homeDispatch({field: 'loading', value: false});
					//获取响应流
					const reader = data.getReader();
					const decoder = new TextDecoder();
					let done = false;
					let isFirst = true; //是否是第一个响应流中的字符
					let text = '';
					//处理响应流
					while (!done) {
						//手动停止响应流
						if (stopConversationRef.current) {
							controller.abort();
							done = true;
							break;
						}
						const {value, done: doneReading} = await reader.read();
						done = doneReading;
						const chunkValue = decoder.decode(value);
						text += chunkValue;
						//如果是响应流中返回了第一个字符
						if (isFirst) {
							isFirst = false;
							//插入一条新的消息
							const updatedMessages: Message[] = [
								...updatedConversation.messages,
								{role: 'assistant', content: chunkValue},
							];
							//更新消息
							updatedConversation = {
								...updatedConversation,
								messages: updatedMessages,
							};
							homeDispatch({
								field: 'selectedConversation',
								value: updatedConversation,
							});
						} else {//如果是响应流中的后续字符
							//更新消息
							const updatedMessages: Message[] =
								updatedConversation.messages.map((message, index) => {
									//如果是最后一条消息，也就是本次对话中GPT返回的消息
									if (index === updatedConversation.messages.length - 1) {
										//刷新消息内容
										return {
											...message,
											content: text,
										};
									}
									//前面的消息直接返回
									return message;
								});
							updatedConversation = {
								...updatedConversation,
								messages: updatedMessages,
							};
							homeDispatch({
								field: 'selectedConversation',
								value: updatedConversation,
							});
						}
					}
					//响应流完成保存当前消息到本地缓存
					saveConversation(updatedConversation);
					//获取全部的消息
					const updatedConversations: Conversation[] = conversations.map(
						(conversation) => {
							//更新当前对话框中的消息
							if (conversation.id === selectedConversation.id) {
								return updatedConversation;
							}
							return conversation;
						},
					);
					//如果是首次发送消息
					if (updatedConversations.length === 0) {
						updatedConversations.push(updatedConversation);
					}
					homeDispatch({field: 'conversations', value: updatedConversations});
					//保存所有对话框消息到本地缓存
					saveConversations(updatedConversations);
					homeDispatch({field: 'messageIsStreaming', value: false});
				} else {
					const {answer} = await response.json();
					const updatedMessages: Message[] = [
						...updatedConversation.messages,
						{role: 'assistant', content: answer},
					];
					updatedConversation = {
						...updatedConversation,
						messages: updatedMessages,
					};
					homeDispatch({
						field: 'selectedConversation',
						value: updateConversation,
					});
					saveConversation(updatedConversation);
					const updatedConversations: Conversation[] = conversations.map(
						(conversation) => {
							if (conversation.id === selectedConversation.id) {
								return updatedConversation;
							}
							return conversation;
						},
					);
					if (updatedConversations.length === 0) {
						updatedConversations.push(updatedConversation);
					}
					homeDispatch({field: 'conversations', value: updatedConversations});
					saveConversations(updatedConversations);
					homeDispatch({field: 'loading', value: false});
					homeDispatch({field: 'messageIsStreaming', value: false});
				}
			}
		},
		[
			apiKey,
			conversations,
			pluginKeys,
			selectedConversation,
			stopConversationRef,
		],
	);

	const scrollToBottom = useCallback(() => {
		if (autoScrollEnabled) {
			messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
			textareaRef.current?.focus();
		}
	}, [autoScrollEnabled]);

	const handleScroll = () => {
		if (chatContainerRef.current) {
			const {scrollTop, scrollHeight, clientHeight} =
				chatContainerRef.current;
			const bottomTolerance = 30;

			if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
				setAutoScrollEnabled(false);
				setShowScrollDownButton(true);
			} else {
				setAutoScrollEnabled(true);
				setShowScrollDownButton(false);
			}
		}
	};

	const handleScrollDown = () => {
		chatContainerRef.current?.scrollTo({
			top: chatContainerRef.current.scrollHeight,
			behavior: 'smooth',
		});
	};

	const handleSettings = () => {
		setShowSettings(!showSettings);
	};

	const onClearAll = () => {
		if (
			confirm(t<string>('Are you sure you want to clear all messages?')) &&
			selectedConversation
		) {
			handleUpdateConversation(selectedConversation, {
				key: 'messages',
				value: [],
			});
		}
	};

	const scrollDown = () => {
		if (autoScrollEnabled) {
			messagesEndRef.current?.scrollIntoView(true);
		}
	};
	const throttledScrollDown = throttle(scrollDown, 250);

	// useEffect(() => {
	//   console.log('currentMessage', currentMessage);
	//   if (currentMessage) {
	//     handleSend(currentMessage);
	//     homeDispatch({ field: 'currentMessage', value: undefined });
	//   }
	// }, [currentMessage]);

	useEffect(() => {
		throttledScrollDown();
		selectedConversation &&
		setCurrentMessage(
			selectedConversation.messages[selectedConversation.messages.length - 2],
		);
	}, [selectedConversation, throttledScrollDown]);

	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				setAutoScrollEnabled(entry.isIntersecting);
				if (entry.isIntersecting) {
					textareaRef.current?.focus();
				}
			},
			{
				root: null,
				threshold: 0.5,
			},
		);
		const messagesEndElement = messagesEndRef.current;
		if (messagesEndElement) {
			observer.observe(messagesEndElement);
		}
		return () => {
			if (messagesEndElement) {
				observer.unobserve(messagesEndElement);
			}
		};
	}, [messagesEndRef]);

	return (
		<div className="relative flex-1 overflow-hidden bg-white dark:bg-[#343541]">
			{!(apiKey || serverSideApiKeyIsSet) ? (
				<div className="mx-auto flex h-full w-[300px] flex-col justify-center space-y-6 sm:w-[600px]">
					<div className="text-center text-4xl font-bold text-black dark:text-white">
						Welcome to Chatbot UI
					</div>
					<div className="text-center text-lg text-black dark:text-white">
						<div className="mb-8">{`Chatbot UI is an open source clone of OpenAI's ChatGPT UI.`}</div>
						<div className="mb-2 font-bold">
							Important: Chatbot UI is 100% unaffiliated with OpenAI.
						</div>
					</div>
					<div className="text-center text-gray-500 dark:text-gray-400">
						<div className="mb-2">
							Chatbot UI allows you to plug in your API key to use this UI with
							their API.
						</div>
						<div className="mb-2">
							It is <span className="italic">only</span> used to communicate
							with their API.
						</div>
						<div className="mb-2">
							{t(
								'Please set your OpenAI API key in the bottom left of the sidebar.',
							)}
						</div>
						<div>
							{t("If you don't have an OpenAI API key, you can get one here: ")}
							<a
								href="https://platform.openai.com/account/api-keys"
								target="_blank"
								rel="noreferrer"
								className="text-blue-500 hover:underline"
							>
								openai.com
							</a>
						</div>
					</div>
				</div>
			) : modelError ? (
				<ErrorMessageDiv error={modelError}/>
			) : (
				<>
					<div
						className="max-h-full overflow-x-hidden"
						ref={chatContainerRef}
						onScroll={handleScroll}
					>
						{selectedConversation?.messages.length === 0 ? (
							<>
								<div
									className="mx-auto flex flex-col space-y-5 md:space-y-10 px-3 pt-5 md:pt-12 sm:max-w-[600px]">
									<div
										className="text-center text-3xl font-semibold text-gray-800 dark:text-gray-100">
										{models.length === 0 ? (
											<div>
												<Spinner size="16px" className="mx-auto"/>
											</div>
										) : (
											'Chatbot UI'
										)}
									</div>

									{models.length > 0 && (
										<div
											className="flex h-full flex-col space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-600">
											<ModelSelect/>

											<SystemPrompt
												conversation={selectedConversation}
												prompts={prompts}
												onChangePrompt={(prompt) =>
													handleUpdateConversation(selectedConversation, {
														key: 'prompt',
														value: prompt,
													})
												}
											/>

											<TemperatureSlider
												label={t('Temperature')}
												onChangeTemperature={(temperature) =>
													handleUpdateConversation(selectedConversation, {
														key: 'temperature',
														value: temperature,
													})
												}
											/>
										</div>
									)}
								</div>
							</>
						) : (
							<>
								<div
									className="sticky top-0 z-10 flex justify-center border border-b-neutral-300 bg-neutral-100 py-2 text-sm text-neutral-500 dark:border-none dark:bg-[#444654] dark:text-neutral-200">
									{t('Model')}: {selectedConversation?.model.name} | {t('Temp')}
									: {selectedConversation?.temperature} |
									<button
										className="ml-2 cursor-pointer hover:opacity-50"
										onClick={handleSettings}
									>
										<IconSettings size={18}/>
									</button>
									<button
										className="ml-2 cursor-pointer hover:opacity-50"
										onClick={onClearAll}
									>
										<IconClearAll size={18}/>
									</button>
								</div>
								{showSettings && (
									<div
										className="flex flex-col space-y-10 md:mx-auto md:max-w-xl md:gap-6 md:py-3 md:pt-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
										<div
											className="flex h-full flex-col space-y-4 border-b border-neutral-200 p-4 dark:border-neutral-600 md:rounded-lg md:border">
											<ModelSelect/>
										</div>
									</div>
								)}

								{selectedConversation?.messages.map((message, index) => (
									<MemoizedChatMessage
										key={index}
										message={message}
										messageIndex={index}
										onEdit={(editedMessage) => {
											setCurrentMessage(editedMessage);
											// discard edited message and the ones that come after then resend
											handleSend(
												editedMessage,
												selectedConversation?.messages.length - index,
											);
										}}
									/>
								))}

								{loading && <ChatLoader/>}

								<div
									className="h-[162px] bg-white dark:bg-[#343541]"
									ref={messagesEndRef}
								/>
							</>
						)}
					</div>

					<ChatInput
						stopConversationRef={stopConversationRef}
						textareaRef={textareaRef}
						onSend={(message, plugin) => {
							setCurrentMessage(message);
							handleSend(message, 0, plugin);
						}}
						onScrollDownClick={handleScrollDown}
						onRegenerate={() => {
							if (currentMessage) {
								handleSend(currentMessage, 2, null);
							}
						}}
						showScrollDownButton={showScrollDownButton}
					/>
				</>
			)}
		</div>
	);
});
Chat.displayName = 'Chat';
