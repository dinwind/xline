import React from "react"
import ChatTextArea from "@/components/chat/ChatTextArea"
import QuotedMessagePreview from "@/components/chat/QuotedMessagePreview"
import { Button } from "@/components/ui/button"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useAxgateLoginGate } from "@/hooks/useAxgateLoginGate"
import { ChatState, MessageHandlers, ScrollBehavior } from "../../types/chatTypes"

interface InputSectionProps {
	chatState: ChatState
	messageHandlers: MessageHandlers
	scrollBehavior: ScrollBehavior
	placeholderText: string
	shouldDisableFilesAndImages: boolean
	selectFilesAndImages: () => Promise<void>
}

/**
 * Input section including quoted message preview and chat text area
 */
export const InputSection: React.FC<InputSectionProps> = ({
	chatState,
	messageHandlers,
	scrollBehavior,
	placeholderText,
	shouldDisableFilesAndImages,
	selectFilesAndImages,
}) => {
	const {
		activeQuote,
		setActiveQuote,
		isTextAreaFocused,
		inputValue,
		setInputValue,
		sendingDisabled,
		selectedImages,
		setSelectedImages,
		selectedFiles,
		setSelectedFiles,
		textAreaRef,
		handleFocusChange,
		lastMessage,
	} = chatState

	const { isAtBottom, scrollToBottomAuto } = scrollBehavior
	const { turnState } = useExtensionState()
	const { requiresLogin, promptLogin } = useAxgateLoginGate()
	const legacyTaskRunning =
		turnState === undefined &&
		(lastMessage?.partial === true || (lastMessage?.type === "say" && lastMessage.say === "api_req_started"))
	const allowQueuedSubmit = turnState?.phase === "streaming" || turnState?.phase === "awaiting_approval" || legacyTaskRunning
	const submitDisabled = requiresLogin || (sendingDisabled && !allowQueuedSubmit)
	const effectivePlaceholder = requiresLogin ? "Sign in to start chatting..." : placeholderText

	return (
		<>
			{requiresLogin && (
				<div className="flex flex-col gap-2 px-3 pt-2 pb-1">
					<div className="rounded border border-neutral-500/30 bg-vscode-editor-background p-3 text-center text-sm text-vscode-foreground">
						Sign in to use Axline chat and access models based on your account permissions.
					</div>
					<Button className="w-full" onClick={promptLogin}>
						Sign in to Axline
					</Button>
				</div>
			)}

			{activeQuote && (
				<div style={{ marginBottom: "-12px", marginTop: "10px" }}>
					<QuotedMessagePreview
						isFocused={isTextAreaFocused}
						onDismiss={() => setActiveQuote(null)}
						text={activeQuote}
					/>
				</div>
			)}

			<ChatTextArea
				activeQuote={activeQuote}
				inputValue={inputValue}
				onFocusChange={handleFocusChange}
				onHeightChange={() => {
					if (isAtBottom) {
						scrollToBottomAuto()
					}
				}}
				onSelectFilesAndImages={selectFilesAndImages}
				onSend={() => {
					if (requiresLogin) {
						promptLogin()
						return
					}
					messageHandlers.handleSendMessage(inputValue, selectedImages, selectedFiles)
				}}
				placeholderText={effectivePlaceholder}
				ref={textAreaRef}
				selectedFiles={selectedFiles}
				selectedImages={selectedImages}
				sendingDisabled={submitDisabled}
				setInputValue={setInputValue}
				setSelectedFiles={setSelectedFiles}
				setSelectedImages={setSelectedImages}
				shouldDisableFilesAndImages={shouldDisableFilesAndImages}
			/>
		</>
	)
}
