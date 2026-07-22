export type ContextField = {
	key: string
	label: string
	value: string
	/** When true, field is always sent and cannot be unchecked. */
	required?: boolean
}

type ContextChecklistProps = {
	fields: ContextField[]
	selectedKeys: string[]
	onChange: (keys: string[]) => void
}

export function ContextChecklist({ fields, selectedKeys, onChange }: ContextChecklistProps) {
	const selected = new Set(selectedKeys)
	const requiredCount = fields.filter((f) => f.required !== false).length

	return (
		<details className="rounded border border-(--vscode-widget-border) px-3 py-2" open>
			<summary className="cursor-pointer text-sm text-(--vscode-foregroundForeground)">
				Environment info sent with feedback
				{requiredCount ? <span className="ml-1 text-xs text-(--vscode-descriptionForeground)">(required)</span> : null}
			</summary>
			<div className="mt-2 flex flex-col gap-2">
				{fields.map((field) => {
					const required = field.required !== false
					const checked = required || selected.has(field.key)
					return (
						<label className="flex items-start gap-2 text-xs" key={field.key}>
							<input
								checked={checked}
								className="mt-0.5"
								disabled={required}
								onChange={(event) => {
									if (required) {
										return
									}
									const next = new Set(selected)
									if (event.target.checked) {
										next.add(field.key)
									} else {
										next.delete(field.key)
									}
									onChange([...next])
								}}
								type="checkbox"
							/>
							<span className="min-w-0">
								<span className="font-medium">{field.label}</span>
								{required ? <span className="ml-1 text-(--vscode-descriptionForeground)">(required)</span> : null}
								<span className="ml-1 text-(--vscode-descriptionForeground) break-all">{field.value || "—"}</span>
							</span>
						</label>
					)
				})}
			</div>
		</details>
	)
}
