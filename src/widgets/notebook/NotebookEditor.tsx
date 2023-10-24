import {
  ActionIcon,
  Button,
  ColorPicker,
  ColorSwatch,
  Group,
  NumberInput,
  Popover,
  ScrollArea,
  Stack,
  TextInput,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure, useInputState } from '@mantine/hooks';
import { Link, RichTextEditor, useRichTextEditorContext } from '@mantine/tiptap';
import {
  IconCheck,
  IconCircleOff,
  IconColumnInsertLeft,
  IconColumnInsertRight,
  IconColumnRemove,
  IconDeviceFloppy,
  IconEdit,
  IconHighlight,
  IconIndentDecrease,
  IconIndentIncrease,
  IconLayoutGrid,
  IconLetterA,
  IconListCheck,
  IconPhoto,
  IconRowInsertBottom,
  IconRowInsertTop,
  IconRowRemove,
  IconTableOff,
  IconTablePlus,
  IconX,
} from '@tabler/icons-react';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import { BubbleMenu, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Dispatch, SetStateAction, useState } from 'react';
import { useEditModeStore } from '~/components/Dashboard/Views/useEditModeStore';
import { useConfigContext } from '~/config/provider';
import { useConfigStore } from '~/config/store';
import { api } from '~/utils/api';

import { WidgetLoading } from '../loading';
import { INotebookWidget } from './NotebookWidgetTile';

export function Editor({ widget }: { widget: INotebookWidget }) {
  const [content, setContent] = useState(widget.properties.content);
  const [toSaveContent, setToSaveContent] = useState(content);

  const { enabled } = useEditModeStore();
  const [isEditing, setIsEditing] = useState(false);

  const { config, name: configName } = useConfigContext();
  const updateConfig = useConfigStore((x) => x.updateConfig);
  const { colors, primaryColor } = useMantineTheme();

  const { mutateAsync } = api.notebook.update.useMutation();

  const editor = useEditor(
    {
      extensions: [
        Color,
        Highlight.configure({ multicolor: true }),
        Image.extend({
          addAttributes() {
            return {
              ...this.parent?.(),
              width: { default: null },
            };
          },
        }).configure({ inline: true }),
        Link.configure({
          openOnClick: true,
          validate(url) {
            return /^https?:\/\//.test(url);
          },
        }),
        StarterKit,
        Table.configure({
          resizable: true, //Not working yet
        }),
        TableCell.extend({
          addAttributes() {
            return {
              ...this.parent?.(),
              backgroundColor: {
                default: undefined,
                renderHTML: (attributes) => ({
                  style: attributes.backgroundColor
                    ? `background-color: ${attributes.backgroundColor}`
                    : undefined,
                }),
                parseHTML: (element) => element.style.backgroundColor || undefined,
              },
            };
          },
        }),
        TableHeader,
        TableRow,
        TaskItem.configure({
          nested: true,
          onReadOnlyChecked: (node, checked) => {
            if (widget.properties.allowReadOnlyCheck) {
              const event = new CustomEvent('onReadOnlyCheck', { detail: { node, checked } });
              dispatchEvent(event);
            }
            return widget.properties.allowReadOnlyCheck;
          },
        }),
        TaskList.configure({ itemTypeName: 'taskItem' }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        TextStyle,
      ],
      content,
      editable: false,
      onUpdate: (e) => {
        setContent(e.editor.getHTML());
      },
    },
    [toSaveContent]
  );

  const handleOnReadOnlyCheck = (event: CustomEventInit) => {
    if (widget.properties.allowReadOnlyCheck && !!editor) {
      editor.state.doc.descendants((subnode, pos) => {
        if (subnode.eq(event.detail.node)) {
          const { tr } = editor.state;
          tr.setNodeMarkup(pos, undefined, {
            ...event.detail.node.attrs,
            checked: event.detail.checked,
          });
          editor.view.dispatch(tr);
          setContent(editor.getHTML());
          handleConfigUpdate(editor.getHTML());
        }
      });
    }
  };

  addEventListener('onReadOnlyCheck', handleOnReadOnlyCheck);

  const handleEditToggle = (previous: boolean) => {
    const current = !previous;
    if (!editor) return current;
    editor.setEditable(current);

    handleConfigUpdate(content);

    return current;
  };

  const handleEditCancel = () => {
    if (!editor) return false;
    editor.setEditable(false);

    editor.commands.setContent(toSaveContent);

    return false;
  };

  const handleConfigUpdate = (contentUpdate: string) => {
    setToSaveContent(contentUpdate);
    updateConfig(
      configName!,
      (previous) => {
        const currentWidget = previous.widgets.find((x) => x.id === widget.id);
        currentWidget!.properties.content = contentUpdate;

        return {
          ...previous,
          widgets: [
            ...previous.widgets.filter((iterationWidget) => iterationWidget.id !== widget.id),
            currentWidget!,
          ],
        };
      },
      true
    );

    void mutateAsync({
      configName: configName!,
      content: contentUpdate,
      widgetId: widget.id,
    });
  };

  if (!config || !configName) return <WidgetLoading />;

  return (
    <>
      <RichTextEditor
        p={0}
        mt={0}
        h="100%"
        editor={editor}
        styles={(theme) => ({
          root: {
            '& .ProseMirror': {
              padding: '0  !important',
            },
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : 'white',
            border: 'none',
            borderRadius: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
          },
          toolbar: {
            backgroundColor: 'transparent',
            padding: '0.5rem',
          },
          content: {
            backgroundColor: 'transparent',
            padding: '0.5rem',
          },
        })}
      >
        <RichTextEditor.Toolbar
          style={{
            display: isEditing && widget.properties.showToolbar === true ? 'flex' : 'none',
          }}
        >
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Strikethrough />
            <ColoredText />
            <ColoredHighlight />
            <RichTextEditor.Code />
            <RichTextEditor.ClearFormatting />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H1 />
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
            <RichTextEditor.H4 />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.AlignLeft />
            <RichTextEditor.AlignCenter />
            <RichTextEditor.AlignRight />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Blockquote />
            <RichTextEditor.Hr />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
            <TaskListToggle />
            {(editor?.isActive('taskList') ||
              editor?.isActive('bulletList') ||
              editor?.isActive('orderedList')) && (
              <>
                <ListIndentIncrease />
                <ListIndentDecrease />
              </>
            )}
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Link />
            <RichTextEditor.Unlink />
            <EmbedImage />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup>
            <TableToggle />
            {editor?.isActive('table') && (
              <>
                <ColoredCell />
                <TableToggleMerge />
                <TableAddColumnBefore />
                <TableAddColumnAfter />
                <TableRemoveColumn />
                <TableAddRowBefore />
                <TableAddRowAfter />
                <TableRemoveRow />
              </>
            )}
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>
        {editor && (
          <BubbleMenu editor={editor}>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
              <RichTextEditor.Link />
            </RichTextEditor.ControlsGroup>
          </BubbleMenu>
        )}

        <ScrollArea mih="4rem" offsetScrollbars pl={12} pt={12}>
          <RichTextEditor.Content />
        </ScrollArea>
      </RichTextEditor>
      {!enabled && (
        <>
          <ActionIcon
            title={isEditing ? 'Save' : 'Edit'}
            style={{
              zIndex: 1,
            }}
            top={7}
            right={7}
            pos="absolute"
            color={primaryColor}
            variant="light"
            size={30}
            radius={'md'}
            onClick={() => setIsEditing(handleEditToggle)}
          >
            {isEditing ? <IconDeviceFloppy size={20} /> : <IconEdit size={20} />}
          </ActionIcon>
          {isEditing && (
            <ActionIcon
              title="Cancel Edit"
              style={{
                zIndex: 1,
              }}
              top={44}
              right={7}
              pos="absolute"
              color={primaryColor}
              variant="light"
              size={30}
              radius={'md'}
              onClick={() => setIsEditing(handleEditCancel)}
            >
              <IconX size={20} />
            </ActionIcon>
          )}
        </>
      )}
    </>
  );
}

function ColoredHighlight() {
  const { editor } = useRichTextEditorContext();
  const defaultColor = 'transparent';
  const [color, setColor] = useState<string>(defaultColor);

  return (
    <ColoredControl
      color={color}
      setColor={setColor}
      hoverText="Colored highlight text"
      icon={<IconHighlight stroke={1.5} size="1rem" />}
      selectionUpdate={() => {
        setColor(editor.getAttributes('highlight').color ?? defaultColor);
      }}
      onSaveHandle={() => {
        editor.chain().focus().setHighlight({ color: color }).run();
      }}
      onUnsetHandle={() => {
        editor.chain().focus().unsetHighlight().run();
        setColor(defaultColor);
      }}
    />
  );
}

function ColoredText() {
  const { editor } = useRichTextEditorContext();
  const { black, colors, colorScheme } = useMantineTheme();
  const defaultColor = colorScheme === 'dark' ? colors.dark[0] : black;
  const [color, setColor] = useState<string>(defaultColor);

  return (
    <ColoredControl
      color={color}
      setColor={setColor}
      hoverText="Color text"
      icon={<IconLetterA stroke={1.5} size="1rem" />}
      selectionUpdate={() => {
        setColor(editor.getAttributes('textStyle').color ?? defaultColor);
      }}
      onSaveHandle={() => {
        editor.chain().focus().setColor(color).run();
      }}
      onUnsetHandle={() => {
        editor.chain().focus().unsetColor().run();
        setColor(defaultColor);
      }}
    />
  );
}

function ColoredCell() {
  const { editor } = useRichTextEditorContext();
  const defaultColor = 'transparent';
  const [color, setColor] = useState<string>(defaultColor);

  return (
    <ColoredControl
      color={color}
      setColor={setColor}
      hoverText="Colored cell"
      icon={<IconLayoutGrid stroke={1.5} size="1rem" />}
      selectionUpdate={() => {
        setColor(editor.getAttributes('tableCell').backgroundColor ?? defaultColor);
      }}
      onSaveHandle={() => {
        editor.chain().focus().setCellAttribute('backgroundColor', color).run();
      }}
      onUnsetHandle={() => {
        editor.chain().focus().setCellAttribute('backgroundColor', undefined).run();
        setColor(defaultColor);
      }}
    />
  );
}

interface ColoredControlProps {
  color: string;
  setColor: Dispatch<SetStateAction<string>>;
  hoverText: string;
  icon: JSX.Element;
  selectionUpdate: () => any;
  onSaveHandle: () => any;
  onUnsetHandle: () => any;
}

function ColoredControl({
  color,
  setColor,
  hoverText,
  icon,
  selectionUpdate,
  onSaveHandle,
  onUnsetHandle,
}: ColoredControlProps) {
  const { editor } = useRichTextEditorContext();
  const { colors, colorScheme, white } = useMantineTheme();
  const [opened, { close, toggle }] = useDisclosure(false);

  const palette = [
    '#000000',
    colors.dark[9],
    colors.dark[6],
    colors.dark[3],
    colors.dark[0],
    '#FFFFFF',
    colors.red[9],
    colors.pink[7],
    colors.grape[8],
    colors.violet[9],
    colors.indigo[9],
    colors.blue[5],
    colors.green[6],
    '#09D630',
    colors.lime[5],
    colors.yellow[5],
    '#EB8415',
    colors.orange[9],
  ];

  editor?.on('selectionUpdate', selectionUpdate);

  return (
    <Popover
      opened={opened}
      onChange={toggle}
      styles={{
        dropdown: {
          backgroundColor: colorScheme === 'dark' ? colors.dark[7] : white,
        },
      }}
    >
      <Popover.Target>
        <RichTextEditor.Control onClick={toggle} title={hoverText}>
          <Group spacing={3} px="0.2rem">
            {icon}
            <ColorSwatch size={14} color={color} />
          </Group>
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack spacing={8}>
          <ColorPicker
            value={color}
            onChange={setColor}
            format="hexa"
            swatches={palette}
            swatchesPerRow={6}
          />
          <Group position="right" spacing={8}>
            <ActionIcon title="Cancel" variant="default" onClick={close}>
              <IconX stroke={1.5} size="1rem" />
            </ActionIcon>
            <ActionIcon
              title="Apply"
              variant="default"
              onClick={() => {
                onSaveHandle();
                close();
              }}
            >
              <IconCheck stroke={1.5} size="1rem" />
            </ActionIcon>
            <ActionIcon
              title="Clear color"
              variant="default"
              onClick={() => {
                onUnsetHandle();
                close();
              }}
            >
              <IconCircleOff stroke={1.5} size="1rem" />
            </ActionIcon>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function EmbedImage() {
  const { editor } = useRichTextEditorContext();
  const { colors, colorScheme, white } = useMantineTheme();
  const [opened, { open, close, toggle }] = useDisclosure(false);
  const [src, setSrc] = useInputState<string>('');
  const [width, setWidth] = useInputState<string>('');

  function setImage() {
    editor.commands.insertContent({
      type: 'paragraph',
      content: [
        {
          type: 'image',
          attrs: {
            width: width,
            src: src,
          },
        },
      ],
    });
    close();
  }

  return (
    <Popover
      opened={opened}
      onClose={() => {
        close();
        setSrc('');
        setWidth('');
      }}
      onOpen={() => {
        open();
        setSrc(editor == null ? '' : editor.getAttributes('image').src);
        setWidth(editor == null ? '' : editor.getAttributes('image').width);
      }}
      position="left"
      styles={{
        dropdown: {
          backgroundColor: colorScheme === 'dark' ? colors.dark[7] : white,
        },
      }}
      trapFocus
    >
      <Popover.Target>
        <RichTextEditor.Control
          onClick={toggle}
          title="Embed Image"
          active={editor?.isActive('image')}
        >
          <IconPhoto stroke={1.5} size="1rem" />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack spacing={5}>
          <TextInput
            label="Source"
            value={src || ''}
            onChange={setSrc}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setImage();
              }
            }}
            placeholder="https://example.com/"
          />
          <TextInput
            label="Width"
            value={width || ''}
            onChange={setWidth}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setImage();
              }
            }}
            placeholder="Value in % or pixels"
          />
          <Button children="Save" variant="default" mt={10} mb={5} onClick={setImage} />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function TaskListToggle() {
  const { editor } = useRichTextEditorContext();

  return (
    <RichTextEditor.Control
      title="Toggle task list item"
      onClick={() => editor.chain().focus().toggleTaskList().run()}
      active={editor?.isActive('taskList')}
    >
      <IconListCheck stroke={1.5} size="1rem" />
    </RichTextEditor.Control>
  );
}

function ListIndentIncrease() {
  const { editor } = useRichTextEditorContext();
  const [itemType, setItemType] = useState('listItem');

  editor?.on('selectionUpdate', ({ editor }) => {
    setItemType(editor?.isActive('taskItem') ? 'taskItem' : 'listItem');
  });

  return (
    <RichTextEditor.Control
      title="Increase indent"
      onClick={() => editor.chain().focus().sinkListItem(itemType).run()}
      interactive={editor.can().sinkListItem(itemType)}
    >
      <IconIndentIncrease stroke={1.5} size="1rem" />
    </RichTextEditor.Control>
  );
}

function ListIndentDecrease() {
  const { editor } = useRichTextEditorContext();
  const [itemType, setItemType] = useState('listItem');

  editor?.on('selectionUpdate', ({ editor }) => {
    setItemType(editor?.isActive('taskItem') ? 'taskItem' : 'listItem');
  });

  return (
    <RichTextEditor.Control
      title="Decrease indent"
      onClick={() => editor.chain().focus().liftListItem(itemType).run()}
      interactive={editor.can().liftListItem(itemType)}
    >
      <IconIndentDecrease stroke={1.5} size="1rem" />
    </RichTextEditor.Control>
  );
}

function TableAddColumnBefore() {
  const { editor } = useRichTextEditorContext();

  return (
    <RichTextEditor.Control
      title="Add Column before"
      onClick={() => editor?.commands.addColumnBefore()}
    >
      <IconColumnInsertLeft stroke={1.5} size="1rem" />
    </RichTextEditor.Control>
  );
}

function TableAddColumnAfter() {
  const { editor } = useRichTextEditorContext();

  return (
    <RichTextEditor.Control
      title="Add Column After"
      onClick={() => editor?.commands.addColumnAfter()}
    >
      <IconColumnInsertRight stroke={1.5} size="1rem" />
    </RichTextEditor.Control>
  );
}

function TableRemoveColumn() {
  const { editor } = useRichTextEditorContext();

  return (
    <RichTextEditor.Control title="Remove Column" onClick={() => editor?.commands.deleteColumn()}>
      <IconColumnRemove stroke={1.5} size="1rem" />
    </RichTextEditor.Control>
  );
}

function TableAddRowBefore() {
  const { editor } = useRichTextEditorContext();

  return (
    <RichTextEditor.Control title="Add Row Before" onClick={() => editor?.commands.addRowBefore()}>
      <IconRowInsertTop stroke={1.5} size="1rem" />
    </RichTextEditor.Control>
  );
}

function TableAddRowAfter() {
  const { editor } = useRichTextEditorContext();

  return (
    <RichTextEditor.Control title="Add Row After" onClick={() => editor?.commands.addRowAfter()}>
      <IconRowInsertBottom stroke={1.5} size="1rem" />
    </RichTextEditor.Control>
  );
}

function TableRemoveRow() {
  const { editor } = useRichTextEditorContext();

  return (
    <RichTextEditor.Control title="Remove Row" onClick={() => editor?.commands.deleteRow()}>
      <IconRowRemove stroke={1.5} size="1rem" />
    </RichTextEditor.Control>
  );
}

function TableToggleMerge() {
  const { editor } = useRichTextEditorContext();

  return (
    <RichTextEditor.Control
      title="Toggle Cell Merging"
      onClick={() => editor?.commands.mergeOrSplit()}
      active={editor?.getAttributes('tableCell').colspan > 1}
    >
      <svg
        height="1rem"
        width="1rem"
        strokeWidth="0.25"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* No existing icon from tabler, taken from https://icon-sets.iconify.design/fluent/table-cells-merge-24-regular/ */}
        <path
          fill="currentColor"
          d="M15.58 11.25H8.42l.89-1.002a.75.75 0 0 0-1.12-.996l-2 2.25a.75.75 0 0 0 0 .996l2 2.25a.75.75 0 1 0 1.12-.996l-.89-1.002h7.16l-.89 1.002a.75.75 0 0 0 1.12.996l2-2.25l.011-.012a.746.746 0 0 0-.013-.987l-1.997-2.247a.75.75 0 0 0-1.121.996l.89 1.002ZM6.25 3A3.25 3.25 0 0 0 3 6.25v11.5A3.25 3.25 0 0 0 6.25 21h11.5A3.25 3.25 0 0 0 21 17.75V6.25A3.25 3.25 0 0 0 17.75 3H6.25ZM4.5 6.25c0-.966.784-1.75 1.75-1.75h11.5c.966 0 1.75.784 1.75 1.75v.25h-15v-.25ZM4.5 8h15v8h-15V8Zm15 9.5v.25a1.75 1.75 0 0 1-1.75 1.75H6.25a1.75 1.75 0 0 1-1.75-1.75v-.25h15Z"
        />
      </svg>
    </RichTextEditor.Control>
  );
}

function TableToggle() {
  const { editor } = useRichTextEditorContext();
  const isActive = editor?.isActive('table');

  const { colors, colorScheme, white } = useMantineTheme();

  const [opened, { open, close, toggle }] = useDisclosure(false);

  const defaultCols = 3;
  const [cols, setCols] = useState<number>(defaultCols);
  const defaultRows = 3;
  const [rows, setRows] = useState<number>(defaultRows);

  function InsertTable(cols: number, rows: number) {
    editor?.commands.insertTable({ rows, cols, withHeaderRow: false });
    close();
  }

  return (
    <Popover
      opened={opened}
      onOpen={() => {
        open();
        setCols(defaultCols);
        setRows(defaultRows);
      }}
      onClose={close}
      styles={{
        dropdown: {
          backgroundColor: colorScheme === 'dark' ? colors.dark[7] : white,
        },
      }}
      trapFocus
    >
      <Popover.Target>
        <RichTextEditor.Control
          title={isActive ? 'Delete Table' : 'Add Table'}
          active={isActive}
          onClick={isActive ? () => editor.commands.deleteTable() : () => toggle()}
        >
          {isActive ? (
            <IconTableOff stroke={1.5} size="1rem" />
          ) : (
            <IconTablePlus stroke={1.5} size="1rem" />
          )}
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack spacing={5}>
          <NumberInput
            label="Columns"
            min={1}
            value={cols}
            onChange={(e) => {
              if (e !== '') {
                setCols(e);
              } else {
                setCols(0);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                InsertTable(cols, rows);
              }
            }}
          />
          <NumberInput
            label="Rows"
            min={1}
            value={rows}
            onChange={(e) => {
              if (e !== '') {
                setRows(e);
              } else {
                setRows(0);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                InsertTable(cols, rows);
              }
            }}
          />
          <Button
            children="Insert"
            variant="default"
            mt={10}
            mb={5}
            onClick={() => InsertTable(cols, rows)}
          />
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
