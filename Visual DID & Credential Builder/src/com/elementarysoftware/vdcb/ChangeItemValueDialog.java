package com.elementarysoftware.vdcb;

import java.util.List;
import java.util.Vector;
import java.util.AbstractMap.SimpleEntry;

import org.eclipse.jface.dialogs.Dialog;
import org.eclipse.jface.dialogs.IDialogConstants;
import org.eclipse.jface.dialogs.MessageDialog;
import org.eclipse.swt.graphics.Point;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.swt.widgets.Combo;
import org.eclipse.jface.viewers.ComboViewer;
import org.eclipse.swt.SWT;
import org.eclipse.swt.events.SelectionAdapter;
import org.eclipse.swt.events.SelectionEvent;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.widgets.Text;
import org.eclipse.swt.widgets.TreeItem;

import com.elementarysoftware.vdcb.tree.actions.JSONAction;

public class ChangeItemValueDialog extends Dialog {
	private Text textValue;
	private Combo comboValueType;
	
	private String selectedType;
	private String itemValue, currentValue, currentType;
	
	/**
	 * Create the dialog.
	 * 
	 * @param parentShell
	 */
	public ChangeItemValueDialog(Shell parentShell, TreeItem sourceItem) {
		super(parentShell);
		
		Object data;
		if(sourceItem.getData() instanceof SimpleEntry) {
			data = ((SimpleEntry) sourceItem.getData()).getValue();
		}
		else {
			data = sourceItem.getData();
		}
		
		currentValue = data.toString();
		if(data instanceof String) {
			currentType =  JSONAction.PRIMITIVE_TYPE_STRING;
		}
		else if(data instanceof Integer) {
			currentType =  JSONAction.PRIMITIVE_TYPE_INTEGER;
		}
		else if(data instanceof Double) {
			currentType =  JSONAction.PRIMITIVE_TYPE_DOUBLE;
		}
		else {
			currentType =  JSONAction.PRIMITIVE_TYPE_STRING;
		}
	}

	/**
	 * Create contents of the dialog.
	 * 
	 * @param parent
	 */
	@Override
	protected Control createDialogArea(Composite parent) {
		Composite container = (Composite) super.createDialogArea(parent);
		GridLayout gridLayout = (GridLayout) container.getLayout();
		gridLayout.numColumns = 3;
		new Label(container, SWT.NONE);

		Label lblType = new Label(container, SWT.NONE);
		lblType.setLayoutData(new GridData(SWT.RIGHT, SWT.CENTER, false, false, 1, 1));
		lblType.setText("Type");

		ComboViewer comboKeyTypeViewer = new ComboViewer(container, SWT.NONE);
		comboValueType = comboKeyTypeViewer.getCombo();
		comboValueType.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1));
		comboValueType.addSelectionListener(new SelectionAdapter() {
			@Override
			public void widgetSelected(SelectionEvent e) {
				setDefaultValue();
			}
		});

		List<String> primitiveTypes = new Vector<String>();
		primitiveTypes.add(JSONAction.PRIMITIVE_TYPE_STRING);
		primitiveTypes.add(JSONAction.PRIMITIVE_TYPE_INTEGER);
		primitiveTypes.add(JSONAction.PRIMITIVE_TYPE_DOUBLE);

		comboValueType.setItems(primitiveTypes.toArray(String[]::new));

		new Label(container, SWT.NONE);

		Label lblValue = new Label(container, SWT.NONE);
		lblValue.setLayoutData(new GridData(SWT.RIGHT, SWT.CENTER, false, false, 1, 1));
		lblValue.setText("Value");

		textValue = new Text(container, SWT.BORDER);
		textValue.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true, false, 1, 1));
		
		
		comboValueType.select(comboValueType.indexOf(currentType));
		textValue.setText(currentValue);

		return container;
	}

	/**
	 * Create contents of the button bar.
	 * 
	 * @param parent
	 */
	@Override
	protected void createButtonsForButtonBar(Composite parent) {
		createButton(parent, IDialogConstants.OK_ID, IDialogConstants.OK_LABEL, true);
		createButton(parent, IDialogConstants.CANCEL_ID, IDialogConstants.CANCEL_LABEL, false);
	}

	/**
	 * Return the initial size of the dialog.
	 */
	@Override
	protected Point getInitialSize() {
		return new Point(450, 300);
	}

	
	private void setDefaultValue() {

		System.out.println("0");
		String defaultValue = "";
		
		if (comboValueType.getSelectionIndex() == -1)
			return;

		String selectedPrimitiveType = comboValueType.getItem(comboValueType.getSelectionIndex());
		if (selectedPrimitiveType.equals(JSONAction.PRIMITIVE_TYPE_STRING)) {
			defaultValue = "new text value";
		} else if (selectedPrimitiveType.equals(JSONAction.PRIMITIVE_TYPE_INTEGER)) {
			defaultValue = String.valueOf(0).toString();
		} else if (selectedPrimitiveType.equals(JSONAction.PRIMITIVE_TYPE_DOUBLE)) {
			defaultValue = String.valueOf(0.0).toString();
		}
		else {
			System.err.println("What?");
			return;
		}

		textValue.setText(defaultValue);
		
	}

	@Override
	protected void okPressed() {

		// check value has been provided
		if (textValue.getText().trim().equals("")) {
			MessageDialog.openWarning(getParentShell(), "No value provided", "Please provide value to continue");
			return;
		}
		
		selectedType = comboValueType.getItem(comboValueType.getSelectionIndex());
		itemValue = textValue.getText().trim();

		super.okPressed();
	}

	public String getSelectedType() {
		return selectedType;
	}

	public String getItemValue() {
		return itemValue;
	}

}
