import { GiteaIcon } from "@/components/icons/data-tools-icons";
import { AlertBlock } from "@/components/shared/alert-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from "@/components/ui/command";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, ChevronsUpDown, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface Repository {
	name: string;
	url: string;
	id: number;
	owner: {
		username: string;
	};
}

interface Branch {
	name: string;
}

interface GiteaProviderType {
	giteaId: string;
	gitProvider: {
		name: string;
		gitProviderId: string;
		providerType: "github" | "gitlab" | "bitbucket" | "gitea";
		createdAt: string;
		organizationId: string;
	};
	name: string;
}

const GiteaProviderSchema = z.object({
	composePath: z.string().min(1),
	repository: z
		.object({
			repo: z.string().min(1, "Repo is required"),
			owner: z.string().min(1, "Owner is required"),
			id: z.number().nullable(),
			giteaPathNamespace: z.string().min(1),
		})
		.required(),
	branch: z.string().min(1, "Branch is required"),
	giteaId: z.string().min(1, "Gitea Provider is required"),
	watchPaths: z.array(z.string()).optional(),
});

type GiteaProvider = z.infer<typeof GiteaProviderSchema>;

interface Props {
	composeId: string;
}

export const SaveGiteaProviderCompose = ({ composeId }: Props) => {
	const { data: giteaProviders } = api.gitea.giteaProviders.useQuery();
	const { data, refetch } = api.compose.one.useQuery({ composeId });

	const { mutateAsync, isLoading: isSavingGiteaProvider } =
		api.compose.update.useMutation();

	const form = useForm<GiteaProvider>({
		defaultValues: {
			composePath: "./docker-compose.yml",
			repository: {
				owner: "",
				repo: "",
				giteaPathNamespace: "",
				id: null,
			},
			giteaId: "",
			branch: "",
			watchPaths: [],
		},
		resolver: zodResolver(GiteaProviderSchema),
	});

	const repository = form.watch("repository");
	const giteaId = form.watch("giteaId");

	const {
		data: repositories,
		isLoading: isLoadingRepositories,
		error,
	} = api.gitea.getGiteaRepositories.useQuery<Repository[]>(
		{
			giteaId,
		},
		{
			enabled: !!giteaId,
		},
	);

	const {
		data: branches,
		fetchStatus,
		status,
	} = api.gitea.getGiteaBranches.useQuery<Branch[]>(
		{
			owner: repository?.owner,
			repositoryName: repository?.repo,
			id: repository?.id || 0,
			giteaId: giteaId,
		},
		{
			enabled: !!repository?.owner && !!repository?.repo && !!giteaId,
		},
	);

	useEffect(() => {
		if (data) {
			form.reset({
				branch: data.giteaBranch || "",
				repository: {
					repo: data.giteaRepository || "",
					owner: data.giteaOwner || "",
					id: null,
					giteaPathNamespace: "",
				},
				composePath: data.composePath,
				giteaId: data.giteaId || "",
				watchPaths: data.watchPaths || [],
			});
		}
	}, [data, form]);

	const onSubmit = async (data: GiteaProvider) => {
		await mutateAsync({
			giteaBranch: data.branch,
			giteaRepository: data.repository.repo,
			giteaOwner: data.repository.owner,
			composePath: data.composePath,
			giteaId: data.giteaId,
			composeId,
			sourceType: "gitea",
			composeStatus: "idle",
			watchPaths: data.watchPaths,
		} as any)
			.then(async () => {
				toast.success("Service Provided Saved");
				await refetch();
			})
			.catch(() => {
				toast.error("Error saving the Gitea provider");
			});
	};

	return (
		<div>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="grid w-full gap-4 py-3"
				>
					{error && <AlertBlock type="error">{error?.message}</AlertBlock>}

					<div className="grid md:grid-cols-2 gap-4">
						<FormField
							control={form.control}
							name="giteaId"
							render={({ field }) => (
								<FormItem className="md:col-span-2 flex flex-col">
									<FormLabel>Gitea Account</FormLabel>
									<Select
										onValueChange={(value) => {
											field.onChange(value);
											form.setValue("repository", {
												owner: "",
												repo: "",
												giteaPathNamespace: "",
												id: null,
											});
											form.setValue("branch", "");
										}}
										value={field.value}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select a Gitea Account" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{giteaProviders?.map((giteaProvider) => (
												<SelectItem
													key={giteaProvider.giteaId}
													value={giteaProvider.giteaId}
												>
													{giteaProvider.gitProvider.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="repository"
							render={({ field }) => (
								<FormItem className="md:col-span-2 flex flex-col">
									<div className="flex items-center justify-between">
										<FormLabel>Repository</FormLabel>
										{field.value.owner && field.value.repo && (
											<Link
												href={`https://gitea.com/${field.value.owner}/${field.value.repo}`}
												target="_blank"
												rel="noopener noreferrer"
												className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
											>
												<GiteaIcon className="h-4 w-4" />
												<span>View Repository</span>
											</Link>
										)}
									</div>
									<Popover>
										<PopoverTrigger asChild>
											<FormControl>
												<Button
													variant="outline"
													className={cn(
														"w-full justify-between !bg-input",
														!field.value && "text-muted-foreground",
													)}
												>
													{isLoadingRepositories
														? "Loading...."
														: field.value.owner
															? repositories?.find(
																	(repo) => repo.name === field.value.repo,
																)?.name
															: "Select repository"}
													<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
												</Button>
											</FormControl>
										</PopoverTrigger>
										<PopoverContent className="p-0" align="start">
											<Command>
												<CommandInput
													placeholder="Search repository..."
													className="h-9"
												/>
												{isLoadingRepositories && (
													<span className="py-6 text-center text-sm">
														Loading Repositories....
													</span>
												)}
												<CommandEmpty>No repositories found.</CommandEmpty>
												<ScrollArea className="h-96">
													<CommandGroup>
														{repositories?.map((repo) => (
															<CommandItem
																key={repo.url}
																value={repo.name}
																onSelect={() => {
																	form.setValue("repository", {
																		owner: repo.owner.username,
																		repo: repo.name,
																		id: repo.id,
																		giteaPathNamespace: repo.url,
																	});
																	form.setValue("branch", "");
																}}
															>
																<span className="flex items-center gap-2">
																	<span>{repo.name}</span>
																	<span className="text-muted-foreground text-xs">
																		{repo.owner.username}
																	</span>
																</span>
																<CheckIcon
																	className={cn(
																		"ml-auto h-4 w-4",
																		repo.name === field.value.repo
																			? "opacity-100"
																			: "opacity-0",
																	)}
																/>
															</CommandItem>
														))}
													</CommandGroup>
												</ScrollArea>
											</Command>
										</PopoverContent>
									</Popover>
									{form.formState.errors.repository && (
										<p className={cn("text-sm font-medium text-destructive")}>
											Repository is required
										</p>
									)}
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="branch"
							render={({ field }) => (
								<FormItem className="block w-full">
									<FormLabel>Branch</FormLabel>
									<Popover>
										<PopoverTrigger asChild>
											<FormControl>
												<Button
													variant="outline"
													className={cn(
														"w-full justify-between !bg-input",
														!field.value && "text-muted-foreground",
													)}
												>
													{status === "loading" && fetchStatus === "fetching"
														? "Loading...."
														: field.value
															? branches?.find(
																	(branch) => branch.name === field.value,
																)?.name
															: "Select branch"}
													<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
												</Button>
											</FormControl>
										</PopoverTrigger>
										<PopoverContent className="p-0" align="start">
											<Command>
												<CommandInput
													placeholder="Search branches..."
													className="h-9"
												/>
												<CommandEmpty>No branches found.</CommandEmpty>
												<ScrollArea className="h-96">
													<CommandGroup>
														{branches?.map((branch) => (
															<CommandItem
																key={branch.name}
																value={branch.name}
																onSelect={() =>
																	form.setValue("branch", branch.name)
																}
															>
																<span className="flex items-center gap-2">
																	{branch.name}
																</span>
																<CheckIcon
																	className={cn(
																		"ml-auto h-4 w-4",
																		branch.name === field.value
																			? "opacity-100"
																			: "opacity-0",
																	)}
																/>
															</CommandItem>
														))}
													</CommandGroup>
												</ScrollArea>
											</Command>
										</PopoverContent>
									</Popover>
									{form.formState.errors.branch && (
										<p className={cn("text-sm font-medium text-destructive")}>
											Branch is required
										</p>
									)}
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="composePath"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Compose Path</FormLabel>
									<FormControl>
										<Input placeholder="docker-compose.yml" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="watchPaths"
							render={({ field }) => (
								<FormItem className="md:col-span-2">
									<div className="flex items-center gap-2">
										<FormLabel>Watch Paths</FormLabel>
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger>
													<div className="size-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
														?
													</div>
												</TooltipTrigger>
												<TooltipContent>
													<p>
														Add paths to watch for changes. When files in these
														paths change, a new deployment will be triggered.
													</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</div>
									<div className="flex flex-wrap gap-2 mb-2">
										{field.value?.map((path, index) => (
											<Badge key={index} variant="secondary">
												{path}
												<X
													className="ml-1 size-3 cursor-pointer"
													onClick={() => {
														const newPaths = [...(field.value || [])];
														newPaths.splice(index, 1);
														form.setValue("watchPaths", newPaths);
													}}
												/>
											</Badge>
										))}
									</div>
									<FormControl>
										<div className="flex gap-2">
											<Input
												placeholder="Enter a path to watch (e.g., src/*, dist/*)"
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														e.preventDefault();
														const input = e.currentTarget;
														const value = input.value.trim();
														if (value) {
															const newPaths = [...(field.value || []), value];
															form.setValue("watchPaths", newPaths);
															input.value = "";
														}
													}
												}}
											/>
											<Button
												type="button"
												variant="secondary"
												onClick={() => {
													const input = document.querySelector(
														'input[placeholder="Enter a path to watch (e.g., src/*, dist/*)"]',
													) as HTMLInputElement;
													const value = input.value.trim();
													if (value) {
														const newPaths = [...(field.value || []), value];
														form.setValue("watchPaths", newPaths);
														input.value = "";
													}
												}}
											>
												Add
											</Button>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<Button
						type="submit"
						className="w-full"
						disabled={isSavingGiteaProvider || !form.formState.isDirty}
					>
						{isSavingGiteaProvider ? "Saving..." : "Save Gitea Provider"}
					</Button>
				</form>
			</Form>
		</div>
	);
};
