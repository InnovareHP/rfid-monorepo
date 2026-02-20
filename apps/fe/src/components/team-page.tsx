import {
  Award,
  Camera,
  Check,
  Clock,
  Mail,
  MoreHorizontal,
  MoreVertical,
  Search,
  Send,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { deleteImage, uploadImage } from "@/services/image/image-service";
import { formatCapitalize, ROLES } from "@dashboard/shared";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@dashboard/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { ScrollArea, ScrollBar } from "@dashboard/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@dashboard/ui/components/tabs";
import { Textarea } from "@dashboard/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Invitation } from "better-auth/plugins";
import type { Member } from "better-auth/plugins/organization";
import { formatDate } from "date-fns";
import debounce from "lodash.debounce";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ReusableTable } from "./reusable-table/generic-table";

const formSchema = z.object({
  email: z.email(),
  role: z.enum([ROLES.LIASON, ROLES.OWNER, ROLES.ADMISSION_MANAGER]),
  message: z.string(),
});

const TeamPage = () => {
  const { data: organizationData } = authClient.useActiveOrganization();
  const queryClient = useQueryClient();
  const memberData = queryClient.getQueryData<Member>([
    "member-data",
    organizationData?.id,
  ]);

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      role: ROLES.LIASON,
      message: "",
    },
    mode: "onChange",
  });
  const [memberTableField, setMemberTableField] = useState({
    page: 1,
    limit: 10,
    search: "",
  });

  const [isOpenEditRoleDialog, setIsOpenEditRoleDialog] = useState(false);
  const [selectedRow, setSelectedRow] = useState<{
    role: string;
    id: string;
  }>();
  const debouncedSearch = useMemo(
    () =>
      debounce((val: string) => {
        setMemberTableField((prev) => ({
          ...prev,
          search: val,
        }));
      }, 500),
    []
  );

  const { data: invitations } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const { data } = await authClient.organization.listInvitations({
        query: {
          organizationId: organizationData?.id ?? "",
        },
      });
      return data;
    },
  });

  const { data: employees, isLoading } = useQuery({
    queryKey: ["member", memberTableField],
    enabled: !!organizationData?.id,
    queryFn: async () =>
      await authClient.organization.listMembers({
        query: {
          organizationId: organizationData?.id ?? "",
          limit: memberTableField.limit.toString(),
          offset: memberTableField.page,
          sortBy: "createdAt",
          sortDirection: "desc",
          filterOperator: "eq",
          filterValue: memberTableField.search,
        },
      }),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "accepted":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <Check className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        );
      case "declined":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <X className="w-3 h-3 mr-1" />
            Declined
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleInvite = async (data: z.infer<typeof formSchema>) => {
    try {
      await authClient.organization.inviteMember({
        email: data.email,
        role: data.role as any,
        organizationId: organizationData?.id ?? "",
        resend: true,
      });
      setIsInviteDialogOpen(false);

      form.reset();

      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast.success("Invitation sent successfully");
    } catch (error) {
      toast.error("Failed to send invitation");
    }
  };

  const handleResendInvitation = async (data: Invitation) => {
    try {
      await authClient.organization.inviteMember({
        email: data.email,
        role: data.role as any,
        organizationId: data.organizationId,
        resend: true,
      });
      toast.success("Invitation sent successfully");
    } catch (error) {
      toast.error("Failed to send invitation");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await authClient.organization.cancelInvitation({
        invitationId: invitationId,
      });

      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast.success("Invitation cancelled successfully");
    } catch (error) {
      toast.error("Failed to cancel invitation");
    }
  };

  const handleRemoveFromTeam = async (memberId: string) => {
    try {
      await authClient.organization.removeMember({
        memberIdOrEmail: memberId,
        organizationId: organizationData?.id ?? "",
      });

      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Member removed from team successfully");
    } catch (error) {
      toast.error("Failed to remove member from team");
    }
  };

  const handleEditRole = async (memberId: string, role: string) => {
    await authClient.organization.updateMemberRole(
      {
        memberId: memberId,
        role: role,
      },
      {
        onError: () => {
          toast.error("Failed to edit role");
        },
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["member", memberTableField],
          });
          toast.success("Role updated successfully");
        },
      }
    );
  };

  const handleLogoClick = () => {
    if (memberData?.role === ROLES.OWNER) {
      logoInputRef.current?.click();
    }
  };

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);

    const data = await uploadImage(file);
    if (!data?.url) throw new Error("Failed to upload image");

    try {
      await authClient.organization.update(
        {
          organizationId: organizationData?.id,
          data: {
            logo: data.url,
          },
        },
        {
          onSuccess: () => {
            toast.success("Team logo uploaded successfully");
            queryClient.invalidateQueries({ queryKey: ["organizationData"] });
          },
          onError: async () => {
            await deleteImage(data.asset_id);
            toast.error("Failed to upload team logo");
          },
        }
      );
    } catch (error) {
      toast.error("Failed to upload team logo");
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  };

  const teamStats = useMemo(() => {
    return {
      totalMembers: employees?.data?.total,
      activeMembers: employees?.data?.total,
      pendingInvites: invitations?.length,
    };
  }, [employees, invitations]);

  return (
    <div className="min-h-screen p-4 bg-gray-50 sm:p-8 rounded-xl">
      <div className="max-w-8xl mx-auto space-y-8">
        <div className="flex flex-wrap space-y-4 items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Team Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your team members and collaborate effectively
            </p>
          </div>
          {memberData?.role === ROLES.OWNER && (
            <Dialog
              open={isInviteDialogOpen}
              onOpenChange={setIsInviteDialogOpen}
            >
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2 w-full sm:w-auto">
                  <UserPlus className="w-4 h-4" />
                  <span>Invite Member</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join {organizationData?.name}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleInvite)}>
                  <div className="space-y-4">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@email.com"
                      {...form.register("email")}
                    />

                    <Label htmlFor="role">Role</Label>
                    <Select
                      {...form.register("role")}
                      onValueChange={(value) =>
                        form.setValue(
                          "role",
                          value as Exclude<
                            (typeof ROLES)[keyof typeof ROLES],
                            "support" | "user" | "super_admin"
                          >
                        )
                      }
                      defaultValue={ROLES.LIASON}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ROLES.LIASON}>Liason</SelectItem>
                        <SelectItem value={ROLES.OWNER}>Owner</SelectItem>
                        <SelectItem value={ROLES.ADMISSION_MANAGER}>
                          Admission Manager
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <Label htmlFor="message">Personal Message (Optional)</Label>
                    <Textarea
                      id="message"
                      placeholder="Welcome to our team!"
                      rows={3}
                      {...form.register("message")}
                    />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsInviteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      disabled={form.formState.isSubmitting}
                      type="submit"
                      className="flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {form.formState.isSubmitting
                          ? "Sending..."
                          : "Send Invitation"}
                      </span>
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex flex-wrap sm:flex-nowrap justify-center items-center space-x-6">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <div className="relative group">
                    <div
                      onClick={handleLogoClick}
                      className={`relative w-16 h-16 rounded-full bg-transparent overflow-hidden border-2 border-gray-200 ${
                        memberData?.role === ROLES.OWNER
                          ? "cursor-pointer hover:border-blue-500 transition-all"
                          : ""
                      }`}
                    >
                      {organizationData?.logo ? (
                        <img
                          src={organizationData?.logo ?? undefined}
                          alt={organizationData?.name.replaceAll("-", " ")}
                          className="w-full h-full object-cover z-50"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      {memberData?.role === "owner" &&
                        !organizationData?.logo && (
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                            <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      {isUploadingLogo && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {organizationData?.name.replaceAll("-", " ")}
                    </h2>
                    {memberData?.role === ROLES.OWNER && (
                      <p className="text-xs text-gray-500">
                        Click logo to upload
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Founded</p>
                <p className="font-semibold">
                  {new Date(
                    organizationData?.createdAt ?? ""
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Members
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {teamStats.totalMembers ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Active Members
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {teamStats.activeMembers ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Award className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pending Invites
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {teamStats.pendingInvites ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            {memberData?.role === ROLES.OWNER && (
              <>
                <TabsTrigger value="members">Team Members</TabsTrigger>
                <TabsTrigger value="invitations">
                  Pending Invitations
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {memberData?.role === ROLES.OWNER && (
            <TabsContent value="members" className="space-y-6">
              <Card className="bg-white/95 backdrop-blur border-0">
                <CardHeader>
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <CardTitle className="text-xl font-bold text-gray-900">
                      Employees
                    </CardTitle>
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search"
                          value={memberTableField.search}
                          onChange={(e) => debouncedSearch(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ReusableTable
                    data={
                      Array.isArray(employees?.data?.members)
                        ? employees.data.members
                        : []
                    }
                    columns={[
                      {
                        key: "user_name",
                        header: "Name",
                        render: (row) => (
                          <div className="flex items-center space-x-2">
                            <Avatar>
                              <AvatarImage src={row?.user.image ?? undefined} />
                              <AvatarFallback>
                                {row?.user.name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{row?.user.name}</span>
                          </div>
                        ),
                      },
                      {
                        key: "user_email",
                        header: "Email",
                        render: (row) => row?.user.email,
                      },
                      {
                        key: "member_position",
                        header: "Role",
                        render: (row) => formatCapitalize(row?.role),
                      },
                      {
                        key: "member_created_at",
                        header: "Joined Date",
                        render: (row) =>
                          formatDate(
                            new Date(row?.createdAt ?? ""),
                            "MM/dd/yyyy"
                          ),
                      },
                      {
                        key: "action",
                        header: "Action",
                        render: (row) => (
                          <>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent align="end">
                                {/* Remove */}
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleRemoveFromTeam(row.userId)
                                  }
                                >
                                  Remove From Team
                                </DropdownMenuItem>

                                {/* Edit Role Trigger */}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedRow(row as any); // <-- store row in state
                                    setIsOpenEditRoleDialog(true);
                                  }}
                                >
                                  Edit Role
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Dialog OUTSIDE the menu */}
                            <Dialog
                              open={isOpenEditRoleDialog}
                              onOpenChange={setIsOpenEditRoleDialog}
                            >
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Edit Role</DialogTitle>
                                </DialogHeader>

                                <Select
                                  value={selectedRow?.role as string}
                                  onValueChange={(value) => {
                                    handleEditRole(
                                      selectedRow?.id as string,
                                      value
                                    );
                                    setIsOpenEditRoleDialog(false);
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Role" />
                                  </SelectTrigger>

                                  <SelectContent>
                                    <SelectItem value={ROLES.LIASON}>
                                      {formatCapitalize(ROLES.LIASON)}
                                    </SelectItem>
                                    <SelectItem value={ROLES.OWNER}>
                                      {formatCapitalize(ROLES.OWNER)}
                                    </SelectItem>
                                    <SelectItem value={ROLES.ADMISSION_MANAGER}>
                                      {formatCapitalize(
                                        ROLES.ADMISSION_MANAGER
                                      )}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </DialogContent>
                            </Dialog>
                          </>
                        ),
                      },
                    ]}
                    currentPage={memberTableField.page}
                    itemsPerPage={10}
                    onPageChange={(page) => {
                      setMemberTableField((prev) => ({
                        ...prev,
                        page,
                      }));
                    }}
                    totalCount={employees?.data?.total}
                    emptyMessage="No members found"
                    isLoading={isLoading}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}
          {memberData?.role === ROLES.OWNER && (
            <TabsContent value="invitations" className="space-y-6">
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span>Pending Invitations</span>
                    <Badge variant="secondary">{invitations?.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea>
                    {invitations?.length === 0 ? (
                      <div className="text-center py-8">
                        <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          No pending invitations
                        </h3>
                        <p className="text-gray-600">
                          All team members have been successfully onboarded.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {invitations?.map((invitation) => (
                          <div
                            key={invitation.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center space-x-4">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-gray-200">
                                  {invitation.email.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {invitation.email}
                                </p>
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <span>{invitation.role}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              {getStatusBadge(invitation.status)}
                              <div className="text-sm text-gray-500">
                                {formatDate(
                                  new Date(invitation.expiresAt),
                                  "MM/dd/yyyy"
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleResendInvitation(invitation)
                                    }
                                  >
                                    Resend Invitation
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleCancelInvitation(invitation.id)
                                    }
                                  >
                                    Cancel Invitation
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default TeamPage;
