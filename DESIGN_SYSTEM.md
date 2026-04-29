# Trippi Unified Design System

## Overview

The Trippi app now uses a unified, reusable design system that ensures consistency across all modals, forms, and components. All styling can be changed in one place and automatically applied throughout the application.

## Core Components

### 1. FormLayout Components (`src/components/FormLayout/index.tsx`)

Form layout components provide consistent structure and styling for all forms.

#### `FormContainer`
Wraps entire form with proper height and scrolling constraints.
```tsx
<FormContainer>
  {/* Form content goes here */}
</FormContainer>
```

#### `FormContent`
Scrollable content area with proper padding and spacing.
```tsx
<FormContent>
  {/* Your form fields */}
</FormContent>
```

#### `FormSection`
Groups related form fields together.
```tsx
<FormSection>
  <FormInput label="Name" />
  <FormInput label="Email" />
</FormSection>
```

#### `FormLabel`
Consistent label styling with variants.
```tsx
<FormLabel variant="primary">Day</FormLabel>
<FormLabel variant="secondary">Arrival</FormLabel>
<FormLabel variant="tertiary">Notes</FormLabel>
<FormLabel variant="default">Standard Label</FormLabel>
```

Variants:
- `primary`: `text-[10px] font-bold text-primary uppercase tracking-[0.2em]`
- `secondary`: `text-[10px] font-bold text-secondary uppercase tracking-[0.2em]`
- `tertiary`: `text-[10px] font-bold text-tertiary uppercase tracking-[0.2em]`
- `default`: `text-sm text-neutral-300`

#### `FormInput`
Consistent text input styling with optional label and error states.
```tsx
<FormInput
  label="Place Name"
  labelVariant="primary"
  placeholder="e.g. Eiffel Tower"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={nameError}
/>
```

#### `FormTextarea`
Consistent textarea styling.
```tsx
<FormTextarea
  label="Notes"
  labelVariant="tertiary"
  placeholder="Add some notes..."
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  rows={3}
/>
```

#### `FormSelect`
Consistent select/dropdown styling.
```tsx
<FormSelect
  label="Day"
  labelVariant="primary"
  value={day}
  onChange={(e) => setDay(e.target.value)}
  options={[
    { value: 1, label: 'Day 1' },
    { value: 2, label: 'Day 2' }
  ]}
/>
```

#### `FormGrid`
Creates responsive grid for form fields.
```tsx
<FormGrid columns={2}>
  <FormInput label="Start Date" type="date" />
  <FormInput label="End Date" type="date" />
</FormGrid>
```

Columns: 1, 2, or 3 (responsive to 1 on mobile)

#### `FormFooter`
Sticky footer for action buttons.
```tsx
<FormFooter>
  <Button variant="primary">Save</Button>
  <Button variant="secondary">Cancel</Button>
</FormFooter>
```

#### `FormListItem`
Reusable list item for documents, links, events with delete functionality.
```tsx
<FormListItem onDelete={() => removeItem(id)}>
  <span>{itemName}</span>
</FormListItem>
```

---

### 2. ModalLayout Components (`src/components/ModalLayout/index.tsx`)

Modal layout components provide consistent modal structure across the app.

#### `ModalBackdrop`
Semi-transparent backdrop that closes modal when clicked.
```tsx
<ModalBackdrop onClick={onClose}>
  <ModalContainer>{/* content */}</ModalContainer>
</ModalBackdrop>
```

#### `ModalContainer`
Main modal box with size variants.
```tsx
<ModalContainer size="md">
  {/* Modal content */}
</ModalContainer>
```

Sizes:
- `sm`: max-w-md
- `md`: max-w-2xl
- `lg`: max-w-4xl
- `xl`: max-w-6xl
- `full`: max-w-4xl

#### `ModalHeader`
Pre-styled header with optional back button.
```tsx
<ModalHeader
  title="Add Event"
  subtitle="Đà Nẵng"
  onClose={handleClose}
  showBackButton={true}
/>
```

#### `ModalContent`
Scrollable content area with max-height constraint.
```tsx
<ModalContent>
  {/* Modal content goes here */}
</ModalContent>
```

#### `ModalFooter`
Button area at bottom of modal.
```tsx
<ModalFooter>
  <Button>Save</Button>
  <Button>Cancel</Button>
</ModalFooter>
```

#### `FullModal`
Complete modal component combining backdrop, container, and content.
```tsx
<FullModal isOpen={isOpen} onClose={onClose} size="md">
  <ModalHeader title="Title" onClose={onClose} />
  <ModalContent>
    {/* Content */}
  </ModalContent>
  <ModalFooter>
    {/* Buttons */}
  </ModalFooter>
</FullModal>
```

---

### 3. Button Components (`src/components/Button/index.tsx`)

Unified button system with variants and sizes.

#### `Button`
Primary button component with variants and sizes.
```tsx
<Button variant="primary" size="md" fullWidth>
  Save Changes
</Button>

<Button variant="secondary" onClick={onCancel}>
  Cancel
</Button>

<Button
  variant="danger"
  icon={<span className="material-symbols-outlined">delete</span>}
  iconPosition="right"
  isLoading={isLoading}
>
  Delete
</Button>
```

**Variants:**
- `primary`: Acid green gradient background
- `secondary`: Electric cyan transparent background
- `tertiary`: Hot pink transparent background
- `ghost`: Transparent with border
- `danger`: Red error state

**Sizes:**
- `xs`: Extra small
- `sm`: Small
- `md`: Medium (default)
- `lg`: Large
- `xl`: Extra large

#### `IconButton`
Button with only an icon.
```tsx
<IconButton
  icon="edit"
  variant="ghost"
  size="md"
  tooltip="Edit trip"
/>
```

#### `FAB`
Floating Action Button for primary actions.
```tsx
<FAB icon="add" label="New" />
```

#### `ButtonGroup`
Groups multiple buttons.
```tsx
<ButtonGroup vertical={false}>
  <Button>Save</Button>
  <Button>Cancel</Button>
</ButtonGroup>
```

---

## Design System CSS (`src/styles/design-system.css`)

All button and styling classes are defined in this file:

- **Button Variants**: `.btn-primary`, `.btn-secondary`, `.btn-tertiary`
- **Button Sizes**: `.btn-xs`, `.btn-sm`, `.btn-md`, `.btn-lg`, `.btn-xl`
- **Modal Classes**: `.modal-backdrop`, `.modal-container`
- **Color Tokens**: Primary (#8ff5ff), Secondary (#c3f400), Tertiary (#ff51fa)

### Modifying Global Styles

To change all button colors, edit `.btn-primary` in `design-system.css`. Changes automatically apply everywhere.

---

## Usage Examples

### Complete Form Example
```tsx
import { FormContainer, FormContent, FormSection, FormLabel, FormInput, FormTextarea, FormFooter } from '@/components/FormLayout'
import { Button } from '@/components/Button'

export default function MyForm() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })

  return (
    <FormContainer>
      <FormContent>
        <FormSection>
          <FormInput
            label="Full Name"
            labelVariant="primary"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <FormInput
            label="Email"
            labelVariant="primary"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <FormTextarea
            label="Message"
            labelVariant="secondary"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          />
        </FormSection>
      </FormContent>
      <FormFooter>
        <Button variant="primary" fullWidth>Submit</Button>
        <Button variant="secondary" fullWidth>Cancel</Button>
      </FormFooter>
    </FormContainer>
  )
}
```

### Complete Modal Example
```tsx
import { ModalBackdrop, ModalContainer, ModalHeader, ModalContent, ModalFooter } from '@/components/ModalLayout'
import { Button } from '@/components/Button'

export default function MyModal({ isOpen, onClose }) {
  return (
    <ModalBackdrop onClick={onClose}>
      <ModalContainer size="md">
        <ModalHeader
          title="Confirm Action"
          subtitle="Are you sure?"
          onClose={onClose}
          showBackButton={true}
        />
        <ModalContent>
          <p>This action cannot be undone.</p>
        </ModalContent>
        <ModalFooter>
          <Button variant="danger">Delete</Button>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContainer>
    </ModalBackdrop>
  )
}
```

---

## Migration Guide

### Updating Existing Components

1. **Replace raw form HTML with layout components**:
   ```tsx
   // Before
   <div className="flex flex-col">
     <label>Name</label>
     <input type="text" />
   </div>

   // After
   <FormInput label="Name" labelVariant="primary" />
   ```

2. **Replace button classes with Button component**:
   ```tsx
   // Before
   <button className="btn-primary btn-md">Save</button>

   // After
   <Button variant="primary" size="md">Save</Button>
   ```

3. **Replace modal backdrops with ModalLayout**:
   ```tsx
   // Before
   <div className="modal-backdrop">
     <div className="modal-container">...</div>
   </div>

   // After
   <ModalBackdrop onClick={onClose}>
     <ModalContainer>{/* content */}</ModalContainer>
   </ModalBackdrop>
   ```

---

## Color Palette

All colors are defined in the design system and use these token names:

- **Primary**: `#8ff5ff` (Electric Cyan) - Use for main actions
- **Secondary**: `#c3f400` (Acid Green) - Use for secondary actions/highlights
- **Tertiary**: `#ff51fa` (Hot Pink) - Use for special/important elements
- **Background**: `#0e0e0e` (Deep Black)
- **Surface**: `#1a1a1a`
- **Text Primary**: `#ffffff` (White)
- **Text Secondary**: `#b0b0b0` (Light Gray)
- **Text Tertiary**: `#808080` (Dark Gray)

---

## Accessibility Notes

- All form inputs have proper labels
- Modal headers can be read by screen readers
- Buttons have clear, descriptive text
- Icons are supplementary only
- Color contrast meets WCAG AA standards
- Focus states are clearly visible

---

## Performance

Components use:
- React.forwardRef for ref forwarding
- Minimal re-renders through prop isolation
- CSS classes for styling (no inline styles)
- No external dependencies for layout

---

## Future Enhancements

- Animation variants for modal entrance/exit
- Dark mode toggle
- Custom theme provider
- Form validation wrapper
- Stepper component for multi-step forms
