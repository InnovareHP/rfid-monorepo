import type { BaaTerms } from "@/services/compliance/compliance-service";
import {
  getBlankBaaUrl,
  signBaa,
} from "@/services/compliance/compliance-service";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { SignaturePad } from "./signature-pad";
import { getApiErrorMessage } from "@/lib/helper/helper";

const OTHER = "Other";

// Mirrors the API's SignBaaSchema; the entity-type escape hatch is resolved
// before submit so the server only ever sees one field.
const schema = z
  .object({
    companyLegalName: z.string().trim().min(2, "Enter the legal entity name"),
    companyJurisdiction: z.string().trim().min(2, "Enter the state of formation"),
    companyEntityType: z.string().min(2, "Select an entity type"),
    companyEntityTypeOther: z.string().trim().optional(),
    companyAddress: z.string().trim().min(5, "Enter the principal office address"),
    signerName: z.string().trim().min(2, "Enter the signer's full name"),
    signerTitle: z.string().trim().min(2, "Enter the signer's title"),
    acknowledged: z.boolean().refine((value) => value, {
      message: "You must acknowledge the agreement",
    }),
    signature: z.string().min(1, "Draw a signature to continue"),
  })
  .superRefine((values, ctx) => {
    if (values.companyEntityType === OTHER && !values.companyEntityTypeOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["companyEntityTypeOther"],
        message: "Describe the entity type",
      });
    }
  });

type SignBaaForm = z.infer<typeof schema>;

type BaaSignModalProps = {
  terms: BaaTerms;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BaaSignModal({ terms, open, onOpenChange }: BaaSignModalProps) {
  const queryClient = useQueryClient();

  const form = useForm<SignBaaForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyLegalName: "",
      companyJurisdiction: "",
      companyEntityType: "",
      companyEntityTypeOther: "",
      companyAddress: "",
      signerName: "",
      signerTitle: "",
      acknowledged: false,
      signature: "",
    },
  });

  const entityType = form.watch("companyEntityType");

  const mutation = useMutation({
    mutationFn: (values: SignBaaForm) =>
      signBaa({
        companyLegalName: values.companyLegalName,
        companyJurisdiction: values.companyJurisdiction,
        companyEntityType:
          values.companyEntityType === OTHER
            ? (values.companyEntityTypeOther as string)
            : values.companyEntityType,
        companyAddress: values.companyAddress,
        signerName: values.signerName,
        signerTitle: values.signerTitle,
        acknowledged: true,
        signature: values.signature,
      }),
    onSuccess: (status) => {
      queryClient.setQueryData(["compliance"], status);
      toast.success("Business Associate Agreement executed");
      onOpenChange(false);
      form.reset();
    },
    onError: (error: unknown) => {
      toast.error(
        getApiErrorMessage(error, "The agreement could not be signed")
      );
    },
  });

  const openBlankDocument = async () => {
    window.open(await getBlankBaaUrl(), "_blank", "noopener");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Business Associate Agreement</DialogTitle>
          <DialogDescription>
            Version {terms.version}. The summary below is not the agreement —
            read the full document before signing.
          </DialogDescription>
        </DialogHeader>

        <Button type="button" variant="outline" onClick={openBlankDocument}>
          Read the full agreement (PDF)
        </Button>

        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {terms.clauses.map((clause) => (
            <li key={clause}>{clause}</li>
          ))}
        </ul>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="companyLegalName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Legal entity name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Health Services, Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="companyJurisdiction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State of formation</FormLabel>
                    <FormControl>
                      <Input placeholder="Ohio" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyEntityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {terms.entityTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {entityType === OTHER && (
              <FormField
                control={form.control}
                name="companyEntityTypeOther"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Describe the entity type</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="companyAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Principal office address</FormLabel>
                  <FormControl>
                    <Input placeholder="100 Main St, Columbus, OH 43004" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="signerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signer name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="signerTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signer title</FormLabel>
                    <FormControl>
                      <Input placeholder="Chief Executive Officer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="signature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Signature</FormLabel>
                  <FormControl>
                    <SignaturePad onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="acknowledged"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="text-sm font-normal leading-snug">
                      {terms.acknowledgement}
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Executing..." : "Sign agreement"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
